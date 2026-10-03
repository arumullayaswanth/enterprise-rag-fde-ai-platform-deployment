/**
 * Ingestion Lambda: triggered by S3 uploads, embeds and indexes documents.
 * Built from app/ingestion/Dockerfile (FROM the AWS Lambda base image). The
 * image's CMD names the handler, so no entrypoint override is needed here.
 *
 * The ingest role is created in the security module and passed in; this module
 * attaches the DLQ send permission to it (the DLQ is defined here).
 */

resource "aws_security_group" "lambda" {
  name        = "${var.name}-lambda"
  description = "Egress-only group for the ingestion Lambda"
  vpc_id      = var.vpc_id

  tags = { Name = "${var.name_tag}-lambda-sg" }
}

resource "aws_vpc_security_group_egress_rule" "lambda_all" {
  security_group_id = aws_security_group.lambda.id
  description       = "Allow all outbound (S3, Bedrock, OpenSearch)"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_cloudwatch_log_group" "ingest" {
  name              = "/aws/lambda/${var.name}-ingest"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "ingest" {
  function_name = "${var.name}-ingest"
  role          = var.ingest_role_arn
  package_type  = "Image"
  image_uri     = var.ingest_image
  # 15 minutes: a full reindex embeds every chunk one by one, and with retry
  # backoff on a low Bedrock quota that can take several minutes.
  timeout     = 900
  memory_size = 1024

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      OPENSEARCH_ENDPOINT = var.opensearch_endpoint
      OPENSEARCH_INDEX    = var.opensearch_index
      EMBED_MODEL_ID      = var.embed_model_id
      EMBED_DIMENSION     = tostring(var.embed_dimension)
      DOCUMENTS_BUCKET    = var.documents_bucket_id
      LOG_LEVEL           = "INFO"
    }
  }

  tracing_config {
    mode = "Active"
  }

  depends_on = [aws_cloudwatch_log_group.ingest]
}

resource "aws_lambda_permission" "allow_s3_invoke" {
  statement_id   = "AllowExecutionFromS3Bucket"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.ingest.function_name
  principal      = "s3.amazonaws.com"
  source_arn     = var.documents_bucket_arn
  source_account = var.account_id
}

# Failed ingests land here instead of vanishing.
resource "aws_sqs_queue" "ingest_dlq" {
  name                      = "${var.name}-ingest-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_lambda_function_event_invoke_config" "ingest" {
  function_name          = aws_lambda_function.ingest.function_name
  maximum_retry_attempts = 1

  destination_config {
    on_failure {
      destination = aws_sqs_queue.ingest_dlq.arn
    }
  }
}

data "aws_iam_policy_document" "lambda_dlq" {
  statement {
    effect    = "Allow"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.ingest_dlq.arn]
  }
}

# Attached to the ingest role (owned by the security module) by name, so the
# DLQ permission lives next to the DLQ without a security <-> lambda cycle.
resource "aws_iam_role_policy" "lambda_dlq" {
  name   = "${var.name}-lambda-dlq"
  role   = var.ingest_role_name
  policy = data.aws_iam_policy_document.lambda_dlq.json
}
