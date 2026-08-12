output "project_id" {
  value = var.prevent_db_destroy ? supabase_project.money_collection_app_project_protected[0].id : supabase_project.money_collection_app_project_unprotected[0].id
}
output "anon_key" {
  value     = data.supabase_apikeys.money_collection_app.anon_key
  sensitive = true
}
