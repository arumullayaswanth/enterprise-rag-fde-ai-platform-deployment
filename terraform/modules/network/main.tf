/**
 * Network foundation: a dedicated VPC with public and private subnets across
 * N AZs. ECS tasks, the ingest Lambda, and OpenSearch all live in the private
 * subnets and reach AWS APIs through a NAT gateway.
 */

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  # /16 carved into /24s: public at .0/.1, private at .10/.11
  public_cidrs  = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i)]
  private_cidrs = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i + 10)]
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.name_tag}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.name_tag}-igw" }
}

# ------------------------------------------------------------------- subnets
resource "aws_subnet" "public" {
  count = var.az_count

  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false # tasks opt in explicitly instead

  tags = {
    Name = "${var.name_tag}-public-subnet-${local.azs[count.index]}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  count = var.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name = "${var.name_tag}-private-subnet-${local.azs[count.index]}"
    Tier = "private"
  }
}

# --------------------------------------------------------------- NAT gateway
# A single NAT gateway keeps cost down. For production, run one per AZ so a
# zone failure cannot cut egress for the whole workload.
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = { Name = "${var.name_tag}-nat-eip" }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = { Name = "${var.name_tag}-nat" }

  depends_on = [aws_internet_gateway.main]
}

# -------------------------------------------------------------- route tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.name_tag}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count = var.az_count

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = { Name = "${var.name_tag}-private-rt" }
}

resource "aws_route_table_association" "private" {
  count = var.az_count

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# S3 gateway endpoint is free and keeps document traffic off the NAT.
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = { Name = "${var.name_tag}-s3-endpoint" }
}

# The default SG is left with no rules so nothing can accidentally use it.
resource "aws_default_security_group" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.name_tag}-default-do-not-use" }
}

/**
 * The API task security group is created here, in the foundation layer, so
 * both the ecs module (which attaches it to tasks) and the alb/search modules
 * (which reference it in cross-SG rules) can consume its id without creating a
 * module dependency cycle. The actual ingress/egress rules are added by the
 * consuming modules against this group.
 */
resource "aws_security_group" "api" {
  name        = "${var.name}-api"
  description = "API tasks: inbound from the ALB and allowed CIDRs only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.name_tag}-api-sg" }
}
