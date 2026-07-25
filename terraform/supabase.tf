resource "supabase_project" "money_collection_app_project" {
  organization_id   = var.supabase_organization_id
  name              = var.supabase_project_name
  database_password = var.supabase_database_password
  region            = var.supabase_region
}

data "supabase_apikeys" "money_collection_app_supabase_apikeys" {
  project_ref = supabase_project.money_collection_app_project.id
}