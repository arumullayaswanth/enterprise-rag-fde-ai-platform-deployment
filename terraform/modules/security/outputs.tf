output "ecs_task_role_arn" {
  value = aws_iam_role.ecs_task.arn
}

output "ecs_execution_role_arn" {
  value = aws_iam_role.ecs_execution.arn
}

output "lambda_ingest_role_arn" {
  value = aws_iam_role.lambda_ingest.arn
}

output "lambda_ingest_role_name" {
  value = aws_iam_role.lambda_ingest.name
}

output "api_key_secret_arn" {
  value = aws_secretsmanager_secret.api_key.arn
}
