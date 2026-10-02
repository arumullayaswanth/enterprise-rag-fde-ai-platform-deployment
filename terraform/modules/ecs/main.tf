/**
 * The query API: ECS Fargate service behind the load balancer.
 * Its image is built from app/api/Dockerfile. The registry lives in the ecr
 * module; roles come from the security module; networking from the network
 * and alb modules.
 */

# The API security group itself is created in the network module and passed in,
# so the alb and search modules can reference it without a dependency cycle.
# This module owns the direct-CIDR ingress and the egress rules on that group.
resource "aws_vpc_security_group_ingress_rule" "api_in" {
  for_each = toset(var.api_ingress_cidrs)

  security_group_id = var.api_security_group_id
  description       = "API traffic from ${each.value}"
  from_port         = var.api_port
  to_port           = var.api_port
  ip_protocol       = "tcp"
  cidr_ipv4         = each.value
}

resource "aws_vpc_security_group_egress_rule" "api_all" {
  security_group_id = var.api_security_group_id
  description       = "Allow all outbound"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.name}-api"
  retention_in_days = var.log_retention_days
}

resource "aws_ecs_cluster" "main" {
  name = var.name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "${var.name_tag}-ecs-cluster" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name      = "api"
    image     = var.api_image
    essential = true

    portMappings = [{
      containerPort = var.api_port
      protocol      = "tcp"
    }]

    environment = [
      { name = "OPENSEARCH_ENDPOINT", value = var.opensearch_endpoint },
      { name = "OPENSEARCH_INDEX", value = var.opensearch_index },
      { name = "EMBED_MODEL_ID", value = var.embed_model_id },
      { name = "EMBED_DIMENSION", value = tostring(var.embed_dimension) },
      { name = "CHAT_MODEL_ID", value = var.chat_model_id },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "REQUIRE_AUTH", value = tostring(var.require_auth) },
      { name = "PORT", value = tostring(var.api_port) },
    ]

    # Injected at start-up; never baked into the image or state. Still provided
    # when require_auth is false so the flag can be flipped without a rebuild.
    secrets = [
      { name = "API_KEY", valueFrom = var.api_key_secret_arn },
    ]

    healthCheck = {
      command     = ["CMD-SHELL", "python -c \"import urllib.request,os;urllib.request.urlopen('http://127.0.0.1:'+os.environ['PORT']+'/health')\" || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }
  }])
}

resource "aws_ecs_service" "api" {
  name                              = "${var.name}-api"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.api.arn
  desired_count                     = var.api_desired_count
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 60
  enable_execute_command            = !var.is_prod

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.api_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "api"
    container_port   = var.api_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  # The listener must exist before the service registers targets.
  depends_on = [var.alb_listener_arn]
}

resource "aws_appautoscaling_target" "api" {
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.api_desired_count
  max_capacity       = var.api_desired_count * 4
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "${var.name}-api-cpu"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.api.service_namespace
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension

  target_tracking_scaling_policy_configuration {
    target_value       = 65
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
