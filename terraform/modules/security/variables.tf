variable "name" {
  description = "Resource name prefix (project-environment)."
  type        = string
}

variable "aws_region" {
  description = "AWS region."
  type        = string
}

variable "account_id" {
  description = "AWS account id."
  type        = string
}

variable "documents_bucket_arn" {
  description = "ARN of the S3 documents bucket the workloads may read."
  type        = string
}

variable "embed_model_id" {
  description = "Bedrock embedding model id."
  type        = string
}

variable "chat_model_id" {
  description = "Bedrock chat model id."
  type        = string
}

variable "opensearch_domain_arn" {
  description = <<-EOT
    ARN of the OpenSearch domain the workloads query. Pass the deterministic
    ARN (arn:aws:es:REGION:ACCOUNT:domain/NAME) rather than the resource
    attribute, so IAM does not depend on the domain and create a cycle.
  EOT
  type        = string
}
