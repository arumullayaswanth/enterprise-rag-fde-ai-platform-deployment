/**
 * Root module: wires the component modules together.
 *
 * Dependency ordering notes
 * -------------------------
 * - The OpenSearch domain ARN is built deterministically from region/account/
 *   name and passed to the security module, so IAM roles do not depend on the
 *   search domain. The search module then consumes the role ARNs for its access
 *   policy. This is what breaks the security <-> search cycle.
 * - The API security group is created in the network module and shared with
 *   ecs, alb, and search, so none of those modules depend on each other to
 *   obtain it.
 * - The storage module's S3 notification depends on the lambda invoke
 *   permission, passed through as invoke_permission_id.
 */

locals {
  name       = "${var.project_name}-${var.environment}"
  account_id = data.aws_caller_identity.current.account_id
  is_prod    = var.environment == "prod"

  # Prefix for console Name tags, lowercase, e.g. "fde-rag-prod".
  name_tag = local.name

  # Deterministic domain ARN, so IAM can grant access without referencing the
  # (not-yet-created) search module and forming a cycle.
  opensearch_domain_arn = "arn:aws:es:${var.aws_region}:${local.account_id}:domain/${local.name}"

  # With no explicit allow-list, only callers inside the VPC can reach the API.
  api_ingress_cidrs = length(var.allowed_ingress_cidrs) > 0 ? var.allowed_ingress_cidrs : [var.vpc_cidr]

  api_image    = "${module.ecr.api_repository_url}:${var.image_tag}"
  ingest_image = "${module.ecr.ingest_repository_url}:${var.image_tag}"
}

# ------------------------------------------------------------- foundation
module "network" {
  source = "./modules/network"

  name       = local.name
  name_tag   = local.name_tag
  aws_region = var.aws_region
  vpc_cidr   = var.vpc_cidr
  az_count   = var.az_count
}

module "ecr" {
  source  = "./modules/ecr"
  name    = local.name
  is_prod = local.is_prod
}

module "storage" {
  source     = "./modules/storage"
  name       = local.name
  account_id = local.account_id

  ingest_lambda_arn            = module.lambda.function_arn
  ingest_permission_depends_on = module.lambda.invoke_permission_id
}

# ------------------------------------------------------------- identity
module "security" {
  source = "./modules/security"

  name                  = local.name
  aws_region            = var.aws_region
  account_id            = local.account_id
  documents_bucket_arn  = module.storage.bucket_arn
  embed_model_id        = var.embed_model_id
  chat_model_id         = var.chat_model_id
  opensearch_domain_arn = local.opensearch_domain_arn
}

# ------------------------------------------------------------- search
module "search" {
  source = "./modules/search"

  name       = local.name
  aws_region = var.aws_region
  account_id = local.account_id
  is_prod    = local.is_prod

  name_tag           = local.name_tag
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  az_count           = var.az_count

  instance_type  = var.opensearch_instance_type
  instance_count = var.opensearch_instance_count
  volume_size    = var.opensearch_volume_size

  api_security_group_id    = module.network.api_security_group_id
  lambda_security_group_id = module.lambda.security_group_id
  allowed_role_arns        = [module.security.ecs_task_role_arn, module.security.lambda_ingest_role_arn]
}

# ------------------------------------------------------------- edge + compute
module "alb" {
  source = "./modules/alb"

  name                  = local.name
  name_tag              = local.name_tag
  is_prod               = local.is_prod
  vpc_id                = module.network.vpc_id
  public_subnet_ids     = module.network.public_subnet_ids
  api_port              = var.api_port
  allowed_web_cidrs     = var.allowed_web_cidrs
  api_security_group_id = module.network.api_security_group_id
}

module "ecs" {
  source = "./modules/ecs"

  name       = local.name
  name_tag   = local.name_tag
  aws_region = var.aws_region
  is_prod    = local.is_prod

  vpc_id                = module.network.vpc_id
  private_subnet_ids    = module.network.private_subnet_ids
  api_ingress_cidrs     = local.api_ingress_cidrs
  api_security_group_id = module.network.api_security_group_id

  api_image          = local.api_image
  api_port           = var.api_port
  api_cpu            = var.api_cpu
  api_memory         = var.api_memory
  api_desired_count  = var.api_desired_count
  log_retention_days = var.log_retention_days
  require_auth       = var.require_auth

  execution_role_arn = module.security.ecs_execution_role_arn
  task_role_arn      = module.security.ecs_task_role_arn
  api_key_secret_arn = module.security.api_key_secret_arn

  opensearch_endpoint = module.search.endpoint
  opensearch_index    = var.opensearch_index
  embed_model_id      = var.embed_model_id
  embed_dimension     = var.embed_dimension
  chat_model_id       = var.chat_model_id

  target_group_arn = module.alb.target_group_arn
  alb_listener_arn = module.alb.listener_arn
}

module "lambda" {
  source = "./modules/lambda"

  name       = local.name
  name_tag   = local.name_tag
  account_id = local.account_id

  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids

  ingest_image       = local.ingest_image
  ingest_role_arn    = module.security.lambda_ingest_role_arn
  ingest_role_name   = module.security.lambda_ingest_role_name
  log_retention_days = var.log_retention_days

  documents_bucket_id  = module.storage.bucket_id
  documents_bucket_arn = module.storage.bucket_arn

  opensearch_endpoint = module.search.endpoint
  opensearch_index    = var.opensearch_index
  embed_model_id      = var.embed_model_id
  embed_dimension     = var.embed_dimension
}
