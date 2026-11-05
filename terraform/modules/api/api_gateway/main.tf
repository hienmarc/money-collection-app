locals {
  prefix = substr(trim(replace(lower(var.resource_prefix), "/[^a-z0-9-]/", "-"), "-"), 0, 20)
  tags = {
    Project     = "money-collection-app"
    Environment = var.environment
    Feature     = "api"
  }
}

resource "aws_apigatewayv2_api" "api" {
  name          = "${local.prefix}-${var.environment}-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_headers = ["authorization", "content-type"]
    allow_methods = ["GET", "POST", "DELETE", "OPTIONS"]
    allow_origins = ["*"]
    max_age       = 3600
  }
  tags = local.tags
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
  default_route_settings {
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
  }
  tags = local.tags
}
