/**
 * Raw document bucket. Uploads under uploads/ trigger the ingestion Lambda.
 *
 * The bucket itself has no dependency on the Lambda; only the notification
 * does. The root module wires the Lambda ARN in and orders creation so the
 * invoke permission exists before the notification is attached.
 */

# The bucket name ends with the AWS account id. S3 bucket names are globally
# unique, so appending the account id means anyone who clones this repo and
# runs it in their own account gets a unique, collision-free bucket name
# without editing anything.
resource "aws_s3_bucket" "documents" {
  bucket = "${var.name}-documents-${var.account_id}"

  # Let Terraform empty and delete the bucket on destroy, even if it still has
  # objects or old versions. Without this, destroy fails on a non-empty
  # versioned bucket.
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket                  = aws_s3_bucket.documents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Deny any request that is not over TLS.
resource "aws_s3_bucket_policy" "documents_tls_only" {
  bucket = aws_s3_bucket.documents.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource = [
        aws_s3_bucket.documents.arn,
        "${aws_s3_bucket.documents.arn}/*",
      ]
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }
      }
    }]
  })
}

# Any upload under uploads/ triggers the ingestion Lambda. The invoke
# permission (owned by the lambda module) must exist first; the root passes it
# through ingest_permission_depends_on.
resource "aws_s3_bucket_notification" "ingest_trigger" {
  bucket = aws_s3_bucket.documents.id

  lambda_function {
    lambda_function_arn = var.ingest_lambda_arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
  }

  depends_on = [var.ingest_permission_depends_on]
}
