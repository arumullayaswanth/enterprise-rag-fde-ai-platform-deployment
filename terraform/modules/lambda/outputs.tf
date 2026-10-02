output "function_name" {
  value = aws_lambda_function.ingest.function_name
}

output "function_arn" {
  value = aws_lambda_function.ingest.arn
}

output "security_group_id" {
  value = aws_security_group.lambda.id
}

output "dlq_url" {
  value = aws_sqs_queue.ingest_dlq.url
}

# Pass this to the storage module's notification so the invoke permission is
# created before the S3 bucket notification is attached.
output "invoke_permission_id" {
  value = aws_lambda_permission.allow_s3_invoke.id
}
