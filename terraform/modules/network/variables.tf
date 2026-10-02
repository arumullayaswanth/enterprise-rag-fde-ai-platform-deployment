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

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "az_count" {
  description = "Number of availability zones to span."
  type        = number
}
