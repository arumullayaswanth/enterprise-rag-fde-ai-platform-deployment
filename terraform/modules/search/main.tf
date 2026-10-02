/**
 * VPC-attached OpenSearch domain for vector + keyword search.
 *
 * Needs the legacy Elasticsearch service-linked role to create ENIs in your
 * subnets, because the domain API is still the "es" API. If it already exists
 * in the account, import it:
 *   terraform import module.search.aws_iam_service_linked_role.opensearch \
 *     arn:aws:iam::<account>:role/aws-service-role/es.amazonaws.com/AWSServiceRoleForAmazonElasticsearchService
 */
resource "aws_iam_service_linked_role" "opensearch" {
  aws_service_name = "es.amazonaws.com"
  description      = "Lets Amazon OpenSearch Service manage VPC networking for ${var.name}"
}

resource "aws_security_group" "opensearch" {
  name        = "${var.name}-opensearch"
  description = "Allows HTTPS from the API and ingest workloads only"
  vpc_id      = var.vpc_id

  tags = { Name = "${var.name_tag}-opensearch-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "opensearch_from_api" {
  security_group_id            = aws_security_group.opensearch.id
  description                  = "HTTPS from application tasks"
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
  referenced_security_group_id = var.api_security_group_id
}

resource "aws_vpc_security_group_ingress_rule" "opensearch_from_lambda" {
  security_group_id            = aws_security_group.opensearch.id
  description                  = "HTTPS from ingestion Lambda"
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
  referenced_security_group_id = var.lambda_security_group_id
}

resource "aws_vpc_security_group_egress_rule" "opensearch_all" {
  security_group_id = aws_security_group.opensearch.id
  description       = "Allow all outbound"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_opensearch_domain" "vectors" {
  domain_name    = var.name
  engine_version = "OpenSearch_2.17"

  cluster_config {
    instance_type            = var.instance_type
    instance_count           = var.instance_count
    zone_awareness_enabled   = var.instance_count > 1
    dedicated_master_enabled = var.is_prod

    dynamic "zone_awareness_config" {
      for_each = var.instance_count > 1 ? [1] : []
      content {
        availability_zone_count = 2
      }
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = var.volume_size
  }

  # Private domain: reachable only from inside the VPC.
  vpc_options {
    subnet_ids         = slice(var.private_subnet_ids, 0, min(var.instance_count, var.az_count))
    security_group_ids = [aws_security_group.opensearch.id]
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  /**
   * Fine-grained access control is intentionally OFF. Authorization is handled
   * by the domain access policy below (only the two task roles), on a VPC-only
   * domain with encryption in transit and at rest. For production, prefer
   * turning FGAC back on and mapping both roles via the OpenSearch security API.
   */
  advanced_security_options {
    enabled                        = false
    anonymous_auth_enabled         = false
    internal_user_database_enabled = false
  }

  # IAM-only access: signed SigV4 requests from the two task roles.
  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        AWS = var.allowed_role_arns
      }
      Action   = "es:ESHttp*"
      Resource = "arn:aws:es:${var.aws_region}:${var.account_id}:domain/${var.name}/*"
    }]
  })

  depends_on = [aws_iam_service_linked_role.opensearch]
}
