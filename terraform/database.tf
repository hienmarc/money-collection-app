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
  db_backup_bucket_name = "${var.aws_resource_prefix}-db-backup-bucket"
}

resource "aws_s3_bucket" "mca_db_backup_bucket" {
  bucket = local.db_backup_bucket_name
  lifecycle {
    prevent_destroy = true
  }
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


# --- IAM Role for GitHub Actions to publish DB backups ---
resource "aws_iam_role" "mca_db_backup_role" {
  name               = "${var.aws_resource_prefix}-db-backup-publish"
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
      "arn:aws:s3:::${local.db_backup_bucket_name}",
      "arn:aws:s3:::${local.db_backup_bucket_name}/*",
    ]
  }
}

resource "aws_iam_role_policy" "mca_db_backup_s3_publish" {
  name   = "mca-db-backup-s3-publish"
  role   = aws_iam_role.mca_db_backup_role.id
  policy = data.aws_iam_policy_document.mca_db_backup_s3_publish.json
}