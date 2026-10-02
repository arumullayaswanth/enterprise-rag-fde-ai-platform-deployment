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

variable "account_id" {
  description = "AWS account id."
  type        = string
}

variable "is_prod" {
  description = "Enables dedicated master nodes in production."
  type        = bool
}

variable "vpc_id" {
  description = "VPC the OpenSearch domain attaches to."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet ids for the domain ENIs."
  type        = list(string)
}

variable "az_count" {
  description = "Number of AZs available (bounds subnet selection)."
  type        = number
}

variable "instance_type" {
  description = "OpenSearch data node instance type."
  type        = string
}

variable "instance_count" {
  description = "Number of OpenSearch data nodes."
  type        = number
}

variable "volume_size" {
  description = "EBS volume size per node, GiB."
  type        = number
}

variable "api_security_group_id" {
  description = "SG of the API tasks allowed to reach OpenSearch."
  type        = string
}

variable "lambda_security_group_id" {
  description = "SG of the ingest Lambda allowed to reach OpenSearch."
  type        = string
}

variable "allowed_role_arns" {
  description = "IAM role ARNs permitted by the domain access policy (SigV4)."
  type        = list(string)
}
