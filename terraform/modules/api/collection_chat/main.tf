data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  prefix        = substr(trim(replace(lower(var.resource_prefix), "/[^a-z0-9-]/", "-"), "-"), 0, 20)
  function_name = "${local.prefix}-${var.environment}-collection-chat-api"
  secret_name   = "${local.prefix}-${var.environment}-collection-chat-db"
  execution_arn = "${var.api_execution_arn}/*/*"
  common_tags = {
    Project     = "money-collection-app"
    Environment = var.environment
    Feature     = "collection-chat"
  }
}

data "archive_file" "chat_api" {
  type        = "zip"
  source_dir  = "${path.module}/../../../../lambdas/collection-chat-api/dist"
  output_path = "${path.root}/.terraform/collection-chat-api.zip"
  excludes    = ["*.test.js"]
}

resource "aws_secretsmanager_secret" "database_password" {
  name        = local.secret_name
  description = "Supabase database password used by the read-only collection chatbot."
  tags        = local.common_tags
}

resource "aws_secretsmanager_secret_version" "database_password" {
  secret_id     = aws_secretsmanager_secret.database_password.id
  secret_string = var.supabase_db_password
}

resource "aws_iam_role" "lambda" {
  name = local.function_name
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

resource "aws_iam_role_policy" "logs" {
  name = "collection-chat-api-logs"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.function_name}:*"
      },
    ]
  })
}

resource "aws_iam_role_policy" "access" {
  name = "collection-chat-api-access"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = "arn:aws:bedrock:${data.aws_region.current.region}::foundation-model/${var.bedrock_model_id}"
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.database_password.arn
      },
    ]
  })
}

resource "aws_lambda_function" "api" {
  function_name    = local.function_name
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs22.x"
  handler          = "handler.handler"
  filename         = data.archive_file.chat_api.output_path
  source_code_hash = data.archive_file.chat_api.output_base64sha256
  timeout          = 30
  memory_size      = 512
  environment {
    variables = {
      SUPABASE_URL           = "https://${var.supabase_project_id}.supabase.co"
      SUPABASE_ANON_KEY      = var.supabase_anon_key
      SUPABASE_DB_HOST       = "aws-0-${var.supabase_region}.pooler.supabase.com"
      SUPABASE_DB_USER       = "postgres.${var.supabase_project_id}"
      SUPABASE_DB_SECRET_ARN = aws_secretsmanager_secret.database_password.arn
      BEDROCK_MODEL_ID       = var.bedrock_model_id
    }
  }
  depends_on = [aws_secretsmanager_secret_version.database_password]
  tags       = local.common_tags
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = var.api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "chat" {
  api_id    = var.api_id
  route_key = "POST /v1/chat"
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_lambda_permission" "api_invoke" {
  statement_id  = "AllowApiGatewayInvokeCollectionChat"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.execution_arn
}
