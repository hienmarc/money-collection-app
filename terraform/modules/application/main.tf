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
      "arn:aws:s3:::${var.aws_resource_prefix}-db-backup-bucket-${var.environment}",
      "arn:aws:s3:::${var.aws_resource_prefix}-db-backup-bucket-${var.environment}/*",
    ]
  }
}

resource "aws_iam_role_policy" "mca_db_backup_s3_publish" {
  name   = "mca-db-backup-s3-publish"
  role   = aws_iam_role.mca_db_backup_role.id
  policy = data.aws_iam_policy_document.mca_db_backup_s3_publish.json
}

resource "upstash_redis_database" "money_collection_app_redis" {
  database_name  = var.redis_database_name
  region         = "global"
  primary_region = var.redis_region
  tls            = true
  eviction       = true
}

resource "vercel_project" "money_collection_app_project" {
  name      = var.vercel_project_name
  framework = "nextjs"
}

data "vercel_project_directory" "money_collection_app_directory" {
  path = var.vercel_project_directory
}

resource "vercel_project_environment_variables" "money_collection_app_env_vars" {
  project_id = vercel_project.money_collection_app_project.id

  depends_on = [
    upstash_redis_database.money_collection_app_redis,
    supabase_project.money_collection_app_project,
  ]

  variables = [
    {
      key       = "NEXT_PUBLIC_SUPABASE_URL"
      value     = "https://${supabase_project.money_collection_app_project.id}.supabase.co"
      target    = [local.vercel_target]
      sensitive = false
    },
    {
      key       = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      value     = data.supabase_apikeys.money_collection_app_supabase_apikeys.anon_key
      target    = [local.vercel_target]
      sensitive = false
    },
    {
      key       = "NUMISTA_API_KEY"
      value     = var.numista_api_key
      target    = [local.vercel_target]
      sensitive = true
    },
    {
      key       = "EXCHANGERATES_API_KEY"
      value     = var.exchangerates_api_key
      target    = [local.vercel_target]
      sensitive = true
    },
    {
      key       = "REST_COUNTRIES_API_KEY"
      value     = var.rest_countries_api_key
      target    = [local.vercel_target]
      sensitive = true
    },
    {
      key       = "UPSTASH_REDIS_REST_URL"
      value     = "https://${upstash_redis_database.money_collection_app_redis.endpoint}"
      target    = [local.vercel_target]
      sensitive = false
    },
    {
      key       = "UPSTASH_REDIS_REST_TOKEN"
      value     = upstash_redis_database.money_collection_app_redis.rest_token
      target    = [local.vercel_target]
      sensitive = true
    },
  ]
}

resource "time_sleep" "wait_for_env_vars" {
  depends_on      = [vercel_project_environment_variables.money_collection_app_env_vars]
  create_duration = "10s"
}

resource "vercel_deployment" "money_collection_app_deployment" {
  project_id  = vercel_project.money_collection_app_project.id
  files       = data.vercel_project_directory.money_collection_app_directory.files
  path_prefix = var.vercel_project_directory
  production  = var.environment == "prod"

  depends_on = [time_sleep.wait_for_env_vars]
}
