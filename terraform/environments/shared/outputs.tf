output "vercel_project_id" { value = vercel_project.money_collection_app.id }
output "redis_rest_url" { value = "https://${upstash_redis_database.money_collection_app.endpoint}" }
output "redis_rest_token" {
  value     = upstash_redis_database.money_collection_app.rest_token
  sensitive = true
}
