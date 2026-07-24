# --- SUPABASE ---
output "supabase_project_id" {
  value = supabase_project.money_collection_app_project.id
}

# --- REDIS ---
output "redis_endpoint" {
  value = upstash_redis_database.money-collection-app-redis.endpoint
}

output "redis_port" {
  value = upstash_redis_database.money-collection-app-redis.port
}

output "redis_password" {
  value     = upstash_redis_database.money-collection-app-redis.password
  sensitive = true
}