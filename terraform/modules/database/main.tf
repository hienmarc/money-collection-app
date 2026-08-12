resource "supabase_project" "money_collection_app_project_protected" {
  count             = var.prevent_db_destroy ? 1 : 0
  organization_id   = var.organization_id
  name              = var.project_name
  database_password = var.database_password
  region            = var.region

  lifecycle {
    prevent_destroy = true
  }
}

resource "supabase_project" "money_collection_app_project_unprotected" {
  count             = var.prevent_db_destroy ? 0 : 1
  organization_id   = var.organization_id
  name              = var.project_name
  database_password = var.database_password
  region            = var.region
}

data "supabase_apikeys" "money_collection_app" {
  project_ref = var.prevent_db_destroy ? supabase_project.money_collection_app_project_protected[0].id : supabase_project.money_collection_app_project_unprotected[0].id
}
