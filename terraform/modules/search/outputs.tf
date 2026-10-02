output "endpoint" {
  value = aws_opensearch_domain.vectors.endpoint
}

output "domain_arn" {
  value = aws_opensearch_domain.vectors.arn
}

output "security_group_id" {
  value = aws_security_group.opensearch.id
}
