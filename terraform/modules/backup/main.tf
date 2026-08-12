resource "aws_s3_bucket" "database" {
  bucket = "${var.resource_prefix}-db-backup-bucket-${var.environment}"
}

resource "aws_s3_bucket_versioning" "database" {
  bucket = aws_s3_bucket.database.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_lifecycle_configuration" "database" {
  bucket = aws_s3_bucket.database.id
  rule {
    id     = "ExpireOldBackups"
    status = "Enabled"
    expiration { days = 30 }
    filter { prefix = "" }
  }
}

resource "aws_s3_bucket_public_access_block" "database" {
  bucket                  = aws_s3_bucket.database.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_iam_openid_connect_provider" "github" { url = "https://token.actions.githubusercontent.com" }

data "aws_iam_policy_document" "assume_role" {
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

resource "aws_iam_role" "database_backup" {
  name               = "${var.resource_prefix}-db-backup-publish-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

data "aws_iam_policy_document" "publish" {
  statement {
    effect  = "Allow"
    actions = ["s3:PutObject", "s3:ListBucket"]
    resources = [
      "arn:aws:s3:::${var.resource_prefix}-db-backup-bucket-${var.environment}",
      "arn:aws:s3:::${var.resource_prefix}-db-backup-bucket-${var.environment}/*",
    ]
  }
}

resource "aws_iam_role_policy" "database_backup" {
  name   = "mca-db-backup-s3-publish-${var.environment}"
  role   = aws_iam_role.database_backup.id
  policy = data.aws_iam_policy_document.publish.json
}
