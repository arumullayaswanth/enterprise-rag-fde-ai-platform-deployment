/**
 * IAM roles and policies for the two workloads, plus the shared API key secret.
 *
 * To avoid a dependency cycle with the search module, this module takes the
 * OpenSearch domain ARN as a plain string (built deterministically in the root
 * from region/account/name) instead of referencing the domain resource. The
 * search module in turn consumes the role ARNs exported here for its access
 * policy — roles are created without any search dependency.
 */

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [var.account_id]
    }
  }
}

# Shared least-privilege permissions: read documents, call Bedrock, query the index.
data "aws_iam_policy_document" "rag_runtime" {
  statement {
    sid       = "ReadDocuments"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:ListBucket"]
    resources = [var.documents_bucket_arn, "${var.documents_bucket_arn}/*"]
  }

  statement {
    sid     = "InvokeBedrockModels"
    effect  = "Allow"
    actions = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
    resources = [
      "arn:aws:bedrock:${var.aws_region}::foundation-model/${var.embed_model_id}",
      "arn:aws:bedrock:${var.aws_region}::foundation-model/${var.chat_model_id}",
      # Cross-region inference profiles route to copies of the model in other
      # regions, so both the profile and the regional model ARNs are required.
      "arn:aws:bedrock:${var.aws_region}:${var.account_id}:inference-profile/*",
      "arn:aws:bedrock:*::foundation-model/${var.chat_model_id}",
    ]
  }

  statement {
    sid    = "AccessSearchIndex"
    effect = "Allow"
    actions = [
      "es:ESHttpGet",
      "es:ESHttpPost",
      "es:ESHttpPut",
      "es:ESHttpHead",
      # Required to drop the index during a full reindex.
      "es:ESHttpDelete",
    ]
    resources = ["${var.opensearch_domain_arn}/*"]
  }

  statement {
    sid       = "ReadApiKeySecret"
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.api_key.arn]
  }
}

resource "aws_iam_policy" "rag_runtime" {
  name        = "${var.name}-runtime"
  description = "Least-privilege runtime access for the RAG workloads"
  policy      = data.aws_iam_policy_document.rag_runtime.json
}

# ------------------------------------------------------------ ingest Lambda
resource "aws_iam_role" "lambda_ingest" {
  name               = "${var.name}-lambda-ingest"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "lambda_runtime" {
  role       = aws_iam_role.lambda_ingest.name
  policy_arn = aws_iam_policy.rag_runtime.arn
}

# VPC access (not just basic execution): a Lambda attached to subnets must be
# able to create and delete ENIs. This managed policy is a superset of
# AWSLambdaBasicExecutionRole, so it also covers CloudWatch Logs.
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_ingest.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# --------------------------------------------------------------- ECS service
# Execution role: what the ECS agent needs (pull image, write logs, read secrets).
resource "aws_iam_role" "ecs_execution" {
  name               = "${var.name}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.api_key.arn]
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "${var.name}-ecs-execution-secrets"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets.json
}

# Task role: what the application code itself is allowed to do.
resource "aws_iam_role" "ecs_task" {
  name               = "${var.name}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_runtime" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.rag_runtime.arn
}

# ------------------------------------------------------------- API key secret
resource "aws_secretsmanager_secret" "api_key" {
  name        = "${var.name}-api-key"
  description = "Shared API key required by the RAG API"
  # 0 = delete immediately on destroy, with no 7-day recovery window. Without
  # this, the secret name stays reserved after a destroy and the next apply
  # fails with "already scheduled for deletion". Fine for this project since
  # the key is regenerated on every deploy.
  recovery_window_in_days = 0
}

resource "random_password" "api_key" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret_version" "api_key" {
  secret_id     = aws_secretsmanager_secret.api_key.id
  secret_string = random_password.api_key.result
}

# The DLQ send permission is attached in the lambda module (where the DLQ is
# defined), using the ingest role name exported below. Keeping it there avoids
# a security <-> lambda dependency cycle.
