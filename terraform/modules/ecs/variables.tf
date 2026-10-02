variable "name" {
  description = "Resource name prefix (project-environment), lowercase/AWS-safe."
  type        = string
}

variable "name_tag" {
  description = "Pretty uppercase prefix for console Name tags, e.g. FDE-RAG-DEV."
  type        = string
}

variable "aws_region" {
  description = "AWS region."
  type        = string
}

variable "is_prod" {
  description = "Disables ECS exec in production."
  type        = bool
}

variable "vpc_id" {
  description = "VPC the API tasks run in."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnets for the Fargate tasks."
  type        = list(string)
}

variable "api_ingress_cidrs" {
  description = "CIDRs allowed to reach the API port directly."
  type        = list(string)
}

variable "api_security_group_id" {
  description = "Security group for the API tasks (created in the network module)."
  type        = string
}

# ---------------------------------------------------------------- container
variable "api_image" {
  description = "Full image reference (repo:tag) for the API."
  type        = string
}

variable "api_port" {
  description = "Port the API listens on."
  type        = number
}

variable "api_cpu" {
  description = "Fargate task CPU units."
  type        = number
}

variable "api_memory" {
  description = "Fargate task memory in MiB."
  type        = number
}

variable "api_desired_count" {
  description = "Number of API tasks to run."
  type        = number
}

variable "log_retention_days" {
  description = "CloudWatch log retention."
  type        = number
}

variable "require_auth" {
  description = "Whether the API requires an x-api-key header."
  type        = bool
}

# ------------------------------------------------------------------ wiring
variable "execution_role_arn" {
  description = "ECS execution role ARN."
  type        = string
}

variable "task_role_arn" {
  description = "ECS task role ARN."
  type        = string
}

variable "api_key_secret_arn" {
  description = "Secrets Manager ARN holding the API key."
  type        = string
}

variable "opensearch_endpoint" {
  description = "OpenSearch endpoint for the app."
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

variable "chat_model_id" {
  description = "Bedrock chat model id."
  type        = string
}

variable "target_group_arn" {
  description = "ALB target group the service registers with."
  type        = string
}

variable "alb_listener_arn" {
  description = "ALB listener; the service depends on it existing first."
  type        = string
}
