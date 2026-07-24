resource "upstash_redis_database" "money-collection-app-redis" {
  database_name = var.redis_database_name
  region        = var.redis_region
  tls           = true
  eviction      = true
}