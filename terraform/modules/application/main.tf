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

module "frontend" {
  source                 = "../frontend"
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
}
