locals {
  vercel_target = var.environment == "prod" ? "production" : "preview"

  vercel_environment_variables = {
    NEXT_PUBLIC_SUPABASE_URL      = { value = "https://${supabase_project.money_collection_app_project.id}.supabase.co", sensitive = false }
    NEXT_PUBLIC_SUPABASE_ANON_KEY = { value = data.supabase_apikeys.money_collection_app_supabase_apikeys.anon_key, sensitive = false }
    NUMISTA_API_KEY               = { value = var.numista_api_key, sensitive = true }
    EXCHANGERATES_API_KEY         = { value = var.exchangerates_api_key, sensitive = true }
    REST_COUNTRIES_API_KEY        = { value = var.rest_countries_api_key, sensitive = true }
    UPSTASH_REDIS_REST_URL        = { value = var.redis_rest_url, sensitive = false }
    UPSTASH_REDIS_REST_TOKEN      = { value = var.redis_rest_token, sensitive = true }
  }
}
