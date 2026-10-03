/**
 * Container registries -- one per service. Each service's Dockerfile lives
 * next to its own code:
 *
 *   app/api/Dockerfile        ->  <name>-api     ->  ECS Fargate  (uvicorn)
 *   app/ingestion/Dockerfile  ->  <name>-ingest  ->  Lambda       (S3 handler)
 *
 * Both images are pushed with the same tag: the git commit SHA. In prod tags
 * are IMMUTABLE, so a tag always means exactly one build and a rollback is
 * simply redeploying an older tag. Outside prod they are MUTABLE.
 */

resource "aws_ecr_repository" "api" {
  name = "${var.name}-api"
  # Mutable tags so a redeploy can reuse the same SHA tag if needed.
  image_tag_mutability = "MUTABLE"
  # force_delete = true so `terraform destroy` removes the repo even though it
  # still holds images. Without this, destroy fails on a non-empty ECR repo.
  force_delete = true

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_repository" "ingest" {
  name = "${var.name}-ingest"
  # Mutable tags so a redeploy can reuse the same SHA tag if needed.
  image_tag_mutability = "MUTABLE"
  # force_delete = true so destroy removes the repo even with images in it.
  force_delete = true

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# Every deploy pushes a new tag, so without this both repositories grow forever.
resource "aws_ecr_lifecycle_policy" "keep_recent" {
  for_each = {
    api    = aws_ecr_repository.api.name
    ingest = aws_ecr_repository.ingest.name
  }

  repository = each.value

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the 10 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
