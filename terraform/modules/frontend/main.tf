locals {
  target = var.environment == "prod" ? "production" : "preview"
  environment_variables = {
    NEXT_PUBLIC_SUPABASE_URL      = { value = "https://${var.supabase_project_id}.supabase.co", sensitive = false }
    NEXT_PUBLIC_SUPABASE_ANON_KEY = { value = var.supabase_anon_key, sensitive = false }
    NUMISTA_API_KEY               = { value = var.numista_api_key, sensitive = true }
    EXCHANGERATES_API_KEY         = { value = var.exchangerates_api_key, sensitive = true }
    REST_COUNTRIES_API_KEY        = { value = var.rest_countries_api_key, sensitive = true }
    UPSTASH_REDIS_REST_URL        = { value = var.redis_rest_url, sensitive = false }
    UPSTASH_REDIS_REST_TOKEN      = { value = var.redis_rest_token, sensitive = true }
  }
}

data "vercel_project_directory" "application" { path = var.project_directory }

resource "vercel_project_environment_variable" "application" {
  for_each   = local.environment_variables
  project_id = var.project_id
  key        = each.key
  value      = each.value.value
  target     = [local.target]
  sensitive  = each.value.sensitive
}

resource "time_sleep" "wait_for_environment_variables" {
  depends_on      = [vercel_project_environment_variable.application]
  create_duration = "10s"
}

resource "vercel_deployment" "application" {
  project_id  = var.project_id
  files       = data.vercel_project_directory.application.files
  path_prefix = var.project_directory
  production  = var.environment == "prod"
  depends_on  = [time_sleep.wait_for_environment_variables]
}
