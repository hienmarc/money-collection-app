output "supabase_project_id" {
  value = supabase_project.money_collection_app_project.id
}

output "db_backup_bucket" {
  value = aws_s3_bucket.mca_db_backup_bucket.bucket
}
