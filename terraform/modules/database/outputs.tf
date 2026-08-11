output "project_id" { value = supabase_project.money_collection_app_project.id }
output "anon_key" {
  value     = data.supabase_apikeys.money_collection_app.anon_key
  sensitive = true
}
