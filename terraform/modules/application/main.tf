resource "supabase_project" "money_collection_app_project" {
  organization_id   = var.supabase_organization_id
  name              = var.supabase_project_name
  database_password = var.supabase_database_password
  region            = var.supabase_region
}

data "supabase_apikeys" "money_collection_app_supabase_apikeys" {
  project_ref = supabase_project.money_collection_app_project.id
}

resource "aws_s3_bucket" "mca_db_backup_bucket" {
  bucket = "${var.aws_resource_prefix}-db-backup-bucket-${var.environment}"
}

resource "aws_s3_bucket_versioning" "versioning_example" {
  bucket = aws_s3_bucket.mca_db_backup_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "mca_db_backup_bucket_lifecycle" {
  bucket = aws_s3_bucket.mca_db_backup_bucket.id

  rule {
    id     = "ExpireOldBackups"
    status = "Enabled"

    expiration {
      days = 30
    }

    filter {
      prefix = ""
    }
  }
}

resource "aws_s3_bucket_public_access_block" "mca_db_backup_bucket_public_access_block" {
  bucket                  = aws_s3_bucket.mca_db_backup_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "mca_db_backup_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "mca_db_backup_role" {
  name               = "${var.aws_resource_prefix}-db-backup-publish-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.mca_db_backup_assume_role.json
}

data "aws_iam_policy_document" "mca_db_backup_s3_publish" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:ListBucket",
    ]
    resources = [
      "arn:aws:s3:::${var.aws_resource_prefix}-db-backup-bucket-${var.environment}",
      "arn:aws:s3:::${var.aws_resource_prefix}-db-backup-bucket-${var.environment}/*",
    ]
  }
}

resource "aws_iam_role_policy" "mca_db_backup_s3_publish" {
  name   = "mca-db-backup-s3-publish-${var.environment}"
  role   = aws_iam_role.mca_db_backup_role.id
  policy = data.aws_iam_policy_document.mca_db_backup_s3_publish.json
}

data "vercel_project_directory" "money_collection_app_directory" {
  path = var.vercel_project_directory
}

resource "vercel_project_environment_variable" "application" {
  for_each = local.vercel_environment_variables

  project_id = var.vercel_project_id
  key        = each.key
  value      = each.value.value
  target     = [local.vercel_target]
  sensitive  = each.value.sensitive

  depends_on = [supabase_project.money_collection_app_project]
}

resource "time_sleep" "wait_for_env_vars" {
  depends_on      = [vercel_project_environment_variable.application]
  create_duration = "10s"
}

resource "vercel_deployment" "money_collection_app_deployment" {
  project_id  = var.vercel_project_id
  files       = data.vercel_project_directory.money_collection_app_directory.files
  path_prefix = var.vercel_project_directory
  production  = var.environment == "prod"

  depends_on = [time_sleep.wait_for_env_vars]
}
