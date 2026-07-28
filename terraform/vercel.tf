resource "vercel_project" "money_collection_app_project" {
  name      = "${var.vercel_project_name}"
  framework = "nextjs"
}

data "vercel_project_directory" "money_collection_app_directory" {
  path = "../frontend"
}

resource "vercel_deployment" "money_collection_app_deployment" {
  project_id  = vercel_project.money_collection_app_project.id
  files       = data.vercel_project_directory.money_collection_app_directory.files
  path_prefix = "../frontend"
  production  = var.deployment_environment == "prod" ? true : false

  depends_on = [vercel_project_environment_variables.money_collection_app_env_vars]
}

resource "vercel_project_environment_variables" "money_collection_app_env_vars" {
  project_id = vercel_project.money_collection_app_project.id
  depends_on = [
    upstash_redis_database.money_collection_app_redis, 
    supabase_project.money_collection_app_project
  ]
  
  variables = [
    {
      key    = "NEXT_PUBLIC_SUPABASE_URL"
      value  = "https://${supabase_project.money_collection_app_project.id}.supabase.co"
      target = [var.deployment_environment == "prod" ? "production" : "preview"]
      sensitive = false
    },
    {
      key    = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      value  = data.supabase_apikeys.money_collection_app_supabase_apikeys.anon_key
      target = [var.deployment_environment == "prod" ? "production" : "preview"]
      sensitive = false
    },
    {
      key    = "NUMISTA_API_KEY"
      value  = var.numista_api_key
      target = [var.deployment_environment == "prod" ? "production" : "preview"]
      sensitive = true
    },
    {
      key    = "EXCHANGERATES_API_KEY"
      value  = var.exchangerates_api_key
      target = [var.deployment_environment == "prod" ? "production" : "preview"]
      sensitive = true
    },
    {
      key    = "REST_COUNTRIES_API_KEY"
      value  = var.rest_countries_api_key
      target = [var.deployment_environment == "prod" ? "production" : "preview"]
      sensitive = true
    },
    {
      key    = "UPSTASH_REDIS_REST_URL"
      value  = "https://${upstash_redis_database.money_collection_app_redis.endpoint}"
      target = [var.deployment_environment == "prod" ? "production" : "preview"]
      sensitive = false
    },
    {
      key    = "UPSTASH_REDIS_REST_TOKEN"
      value  = upstash_redis_database.money_collection_app_redis.rest_token
      target = [var.deployment_environment == "prod" ? "production" : "preview"]
      sensitive = true
    },
  ]
}