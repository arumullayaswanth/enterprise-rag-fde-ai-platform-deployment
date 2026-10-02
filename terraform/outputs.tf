output "web_url" {
  description = "Open this in a browser to use the RAG console."
  value       = "http://${module.alb.dns_name}"
}

output "documents_bucket" {
  description = "S3 bucket holding source documents. Upload under uploads/ to trigger ingestion."
  value       = module.storage.bucket_id
}

# ------------------------------------------------------------------- images
output "api_repository_url" {
  description = "Push the app/api/Dockerfile image here."
  value       = module.ecr.api_repository_url
}

output "ingest_repository_url" {
  description = "Push the app/ingestion/Dockerfile image here."
  value       = module.ecr.ingest_repository_url
}

# ---------------------------------------------------------------- workloads
output "ecs_cluster_name" {
  description = "ECS cluster running the API."
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service running the API."
  value       = module.ecs.service_name
}

output "ingest_lambda_name" {
  description = "Ingestion Lambda triggered by S3 uploads."
  value       = module.lambda.function_name
}

output "ingest_dlq_url" {
  description = "Dead-letter queue for failed ingests."
  value       = module.lambda.dlq_url
}

# ------------------------------------------------------------------- search
output "opensearch_endpoint" {
  description = "VPC-only OpenSearch endpoint used by the app."
  value       = module.search.endpoint
}

output "opensearch_index" {
  description = "Index name holding the embedded chunks."
  value       = var.opensearch_index
}

output "chat_model_id" {
  description = "Bedrock generation model in use."
  value       = var.chat_model_id
}

# --------------------------------------------------------------------- misc
output "api_key_secret_arn" {
  description = "Secrets Manager ARN holding the API key. Read it with the AWS CLI; it is not printed here."
  value       = module.security.api_key_secret_arn
}

output "vpc_id" {
  description = "VPC created by this stack."
  value       = module.network.vpc_id
}
