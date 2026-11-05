module "database" {
  source             = "../database"
  prevent_db_destroy = var.environment == "prod" ? true : false
  organization_id    = var.supabase_organization_id
  project_name       = var.supabase_project_name
  database_password  = var.supabase_database_password
  region             = var.supabase_region
}

module "backup" {
  source          = "../backup"
  environment     = var.environment
  resource_prefix = var.aws_resource_prefix
  github_repo     = var.github_repo
}

module "api_gateway" {
  source = "../api/api_gateway"

  environment     = var.environment
  resource_prefix = var.aws_resource_prefix
}

module "image_search" {
  source              = "../api/image_search"
  environment         = var.environment
  resource_prefix     = var.aws_resource_prefix
  api_id              = module.api_gateway.api_id
  api_execution_arn   = module.api_gateway.api_execution_arn
  supabase_project_id = module.database.project_id
  supabase_anon_key   = module.database.anon_key
  numista_api_key     = var.numista_api_key
}

module "collection_chat" {
  source = "../api/collection_chat"

  environment          = var.environment
  resource_prefix      = var.aws_resource_prefix
  api_id               = module.api_gateway.api_id
  api_execution_arn    = module.api_gateway.api_execution_arn
  supabase_project_id  = module.database.project_id
  supabase_region      = var.supabase_region
  supabase_anon_key    = module.database.anon_key
  supabase_db_password = var.supabase_database_password
}

module "frontend" {
  source                 = "../frontend"
  depends_on             = [module.image_search, module.collection_chat]
  environment            = var.environment
  project_id             = var.vercel_project_id
  project_directory      = var.vercel_project_directory
  supabase_project_id    = module.database.project_id
  supabase_anon_key      = module.database.anon_key
  redis_rest_url         = var.redis_rest_url
  redis_rest_token       = var.redis_rest_token
  numista_api_key        = var.numista_api_key
  exchangerates_api_key  = var.exchangerates_api_key
  rest_countries_api_key = var.rest_countries_api_key
  image_search_api_url   = module.api_gateway.api_url
}

moved {
  from = module.image_search.aws_apigatewayv2_api.image_search
  to   = module.api_gateway.aws_apigatewayv2_api.api
}

moved {
  from = module.image_search.aws_apigatewayv2_stage.default
  to   = module.api_gateway.aws_apigatewayv2_stage.default
}
