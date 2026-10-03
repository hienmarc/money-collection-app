data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  prefix      = substr(trim(replace(lower(var.resource_prefix), "/[^a-z0-9-]/", "-"), "-"), 0, 20)
  bucket_name = "${local.prefix}-${var.environment}-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.region}-imgsrch"
  common_tags = {
    Project     = "money-collection-app"
    Environment = var.environment
    Feature     = "image-search"
  }
}

resource "aws_s3_bucket" "images" {
  bucket = local.bucket_name
  tags   = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "images" {
  bucket                  = aws_s3_bucket.images.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["POST"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  rule {
    id     = "expire-image-search-uploads"
    status = "Enabled"
    filter {
      prefix = "users/"
    }
    expiration {
      days = 3
    }
  }
}

resource "aws_dynamodb_table" "jobs" {
  name         = "${local.prefix}-${var.environment}-image-search-jobs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "owner_id"
  range_key    = "job_id"

  attribute {
    name = "owner_id"
    type = "S"
  }
  attribute {
    name = "job_id"
    type = "S"
  }
  attribute {
    name = "created_key"
    type = "S"
  }

  global_secondary_index {
    name = "owner-created-index"
    key_schema {
      attribute_name = "owner_id"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "created_key"
      key_type       = "RANGE"
    }
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = local.common_tags
}

resource "aws_sqs_queue" "processor_failures" {
  name                      = "${local.prefix}-${var.environment}-image-search-failures"
  message_retention_seconds = 1209600
  tags                      = local.common_tags
}

data "archive_file" "api" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambdas/image-search-api/dist"
  output_path = "${path.root}/.terraform/image-search-api.zip"
}

data "archive_file" "processor" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambdas/image-search-processor"
  output_path = "${path.root}/.terraform/image-search-processor.zip"
  excludes    = ["__pycache__/**", "*.pyc"]
}

resource "aws_iam_role" "api" {
  name = "${local.prefix}-${var.environment}-image-search-api"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
  tags = local.common_tags
}

resource "aws_iam_role" "processor" {
  name = "${local.prefix}-${var.environment}-image-search-processor"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "api_logs" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "processor_logs" {
  role       = aws_iam_role.processor.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "api" {
  name = "image-search-api-access"
  role = aws_iam_role.api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Query"]
        Resource = [aws_dynamodb_table.jobs.arn, "${aws_dynamodb_table.jobs.arn}/index/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.images.arn}/users/*"
      },
    ]
  })
}

resource "aws_iam_role_policy" "processor" {
  name = "image-search-processor-access"
  role = aws_iam_role.processor.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
        Resource = aws_dynamodb_table.jobs.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.images.arn}/users/*"
      },
      {
        Effect   = "Allow"
        Action   = ["textract:DetectDocumentText"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = "arn:aws:bedrock:${data.aws_region.current.region}::foundation-model/${var.bedrock_model_id}"
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = aws_sqs_queue.processor_failures.arn
      },
    ]
  })
}

resource "aws_lambda_function" "api" {
  function_name    = "${local.prefix}-${var.environment}-image-search-api"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  handler          = "handler.handler"
  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256
  timeout          = 30
  memory_size      = 256
  environment {
    variables = {
      JOBS_TABLE          = aws_dynamodb_table.jobs.name
      IMAGES_BUCKET       = aws_s3_bucket.images.bucket
      SUPABASE_URL        = "https://${var.supabase_project_id}.supabase.co"
      SUPABASE_ANON_KEY   = var.supabase_anon_key
      MAX_UPLOAD_BYTES    = "5242880"
      UPLOAD_URL_TTL_SECS = "300"
      IMAGE_URL_TTL_SECS  = "900"
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "processor" {
  function_name    = "${local.prefix}-${var.environment}-image-search-processor"
  role             = aws_iam_role.processor.arn
  runtime          = "python3.12"
  handler          = "handler.lambda_handler"
  filename         = data.archive_file.processor.output_path
  source_code_hash = data.archive_file.processor.output_base64sha256
  timeout          = 300
  memory_size      = 1024
  environment {
    variables = {
      JOBS_TABLE        = aws_dynamodb_table.jobs.name
      NUMISTA_API_KEY   = var.numista_api_key
      BEDROCK_MODEL_ID  = var.bedrock_model_id
      LEASE_SECONDS     = "330"
      NUMISTA_MAX_ITEMS = "12"
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function_event_invoke_config" "processor" {
  function_name                = aws_lambda_function.processor.function_name
  maximum_retry_attempts       = 2
  maximum_event_age_in_seconds = 3600
  destination_config {
    on_failure {
      destination = aws_sqs_queue.processor_failures.arn
    }
  }
}

resource "aws_lambda_permission" "s3_invoke_processor" {
  statement_id   = "AllowS3InvokeImageSearchProcessor"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.processor.arn
  principal      = "s3.amazonaws.com"
  source_arn     = aws_s3_bucket.images.arn
  source_account = data.aws_caller_identity.current.account_id
}

resource "aws_s3_bucket_notification" "images" {
  bucket = aws_s3_bucket.images.id
  lambda_function {
    lambda_function_arn = aws_lambda_function.processor.arn
    events              = ["s3:ObjectCreated:Post"]
    filter_prefix       = "users/"
  }
  depends_on = [aws_lambda_permission.s3_invoke_processor]
}

resource "aws_apigatewayv2_api" "image_search" {
  name          = "${local.prefix}-${var.environment}-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_headers = ["authorization", "content-type"]
    allow_methods = ["GET", "POST", "DELETE", "OPTIONS"]
    allow_origins = ["*"]
    max_age       = 3600
  }
  tags = local.common_tags
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.image_search.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "image_search" {
  for_each = toset([
    "POST /v1/image-searches",
    "GET /v1/image-searches",
    "GET /v1/image-searches/{jobId}",
    "DELETE /v1/image-searches/{jobId}",
  ])
  api_id    = aws_apigatewayv2_api.image_search.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.image_search.id
  name        = "$default"
  auto_deploy = true
  default_route_settings {
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
  }
  tags = local.common_tags
}

resource "aws_lambda_permission" "api_invoke" {
  statement_id  = "AllowApiGatewayInvokeImageSearch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.image_search.execution_arn}/*/*"
}
