variable "name" {
  description = "Resource name prefix (project-environment), lowercase/AWS-safe."
  type        = string
}

variable "name_tag" {
  description = "Pretty uppercase prefix for console Name tags, e.g. FDE-RAG-DEV."
  type        = string
}

variable "is_prod" {
  description = "Enables deletion protection in production."
  type        = bool
}

variable "vpc_id" {
  description = "VPC the ALB and target group live in."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnets for the internet-facing ALB."
  type        = list(string)
}

variable "api_port" {
  description = "Port the API listens on."
  type        = number
}

variable "allowed_web_cidrs" {
  description = "CIDRs allowed to reach the public load balancer on port 80."
  type        = list(string)
}

variable "api_security_group_id" {
  description = "SG of the API tasks, so the ALB can forward to them."
  type        = string
}
