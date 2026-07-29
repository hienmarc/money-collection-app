# --- Supabase Project ---
resource "supabase_project" "money_collection_app_project" {
  organization_id   = var.supabase_organization_id
  name              = var.supabase_project_name
  database_password = var.supabase_database_password
  region            = var.supabase_region
}

data "supabase_apikeys" "money_collection_app_supabase_apikeys" {
  project_ref = supabase_project.money_collection_app_project.id
}

# --- AWS backup bucket for Supabase ---
locals {
  db_backup_bucket_name = "money-collection-app-db-backup-bucket"
}

resource "aws_s3_bucket" "mca_db_backup_bucket" {
  bucket = local.db_backup_bucket_name

  lifecycle {
    prevent_destroy = true
  }

  # Make sure policy is attached to role before creating the bucket
  depends_on = [aws_iam_role_policy.mca_db_backup_s3_publish]
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

# --- IAM Role for GitHub Actions to access S3 bucket ---
data "aws_iam_policy_document" "mca_db_backup_s3_publish" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:CreateBucket"
    ]
    resources = [
      "arn:aws:s3:::${local.db_backup_bucket_name}",
      "arn:aws:s3:::${local.db_backup_bucket_name}/*",
    ]
  }
}

resource "aws_iam_role_policy" "mca_db_backup_s3_publish" {
  name   = "mca-db-backup-s3-publish"
  role   = data.tfe_outputs.bootstrap.values.github_actions_role_name
  policy = data.aws_iam_policy_document.mca_db_backup_s3_publish.json
}
