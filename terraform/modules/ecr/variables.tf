variable "name" {
  description = "Resource name prefix (project-environment)."
  type        = string
}

variable "is_prod" {
  description = "When true, image tags are immutable and repos are not force-deleted."
  type        = bool
}
