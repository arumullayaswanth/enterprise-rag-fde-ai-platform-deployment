variable "name" {
  description = "Resource name prefix (project-environment)."
  type        = string
}

variable "account_id" {
  description = "AWS account id, appended to the bucket name to keep it globally unique."
  type        = string
}

variable "ingest_lambda_arn" {
  description = "ARN of the ingest Lambda to invoke on new uploads."
  type        = string
}

variable "ingest_permission_depends_on" {
  description = "Pass the lambda invoke permission resource so the notification is created after it."
  type        = any
  default     = null
}
