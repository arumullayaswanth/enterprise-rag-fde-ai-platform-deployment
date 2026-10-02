variable "name" {
  description = "Resource name prefix (project-environment), lowercase/AWS-safe."
  type        = string
}

variable "name_tag" {
  description = "Pretty uppercase prefix for console Name tags, e.g. FDE-RAG-DEV."
  type        = string
}

variable "account_id" {
  description = "AWS account id."
  type        = string
}

variable "vpc_id" {
  description = "VPC the Lambda attaches to."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnets for the Lambda ENIs."
  type        = list(string)
}

variable "ingest_image" {
  description = "Full image reference (repo:tag) for the ingest Lambda."
  type        = string
}

variable "ingest_role_arn" {
  description = "ARN of the ingest Lambda execution role."
  type        = string
}

variable "ingest_role_name" {
  description = "Name of the ingest role, for attaching the DLQ policy."
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention."
  type        = number
}

variable "documents_bucket_id" {
  description = "S3 documents bucket name (for the DOCUMENTS_BUCKET env var)."
  type        = string
}

variable "documents_bucket_arn" {
  description = "S3 documents bucket ARN (source for the invoke permission)."
  type        = string
}

variable "opensearch_endpoint" {
  description = "OpenSearch endpoint for indexing."
  type        = string
}

variable "opensearch_index" {
  description = "Index name holding embedded chunks."
  type        = string
}

variable "embed_model_id" {
  description = "Bedrock embedding model id."
  type        = string
}

variable "embed_dimension" {
  description = "Embedding vector dimension."
  type        = number
}
