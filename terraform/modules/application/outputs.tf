output "supabase_project_id" {
  value = module.database.project_id
}

output "db_backup_bucket" {
  value = module.backup.bucket_name
}
