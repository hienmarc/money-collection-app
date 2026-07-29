# --- SUPABASE ---
output "supabase_project_id" {
  value = supabase_project.money_collection_app_project.id
}

# --- REDIS ---
output "redis_endpoint" {
  value = upstash_redis_database.money_collection_app_redis.endpoint
}

output "redis_port" {
  value = upstash_redis_database.money_collection_app_redis.port
}

# --- AWS ---
output "db_backup_bucket" {
  value = aws_s3_bucket.mca_db_backup_bucket.bucket
}
