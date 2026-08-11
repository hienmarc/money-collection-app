resource "supabase_project" "money_collection_app_project" {
  organization_id   = var.organization_id
  name              = var.project_name
  database_password = var.database_password
  region            = var.region
}

data "supabase_apikeys" "money_collection_app" {
  project_ref = supabase_project.money_collection_app_project.id
}
