/// Supabase
variable "supabase_project_name" {
  type = string
}

variable "supabase_access_token" {
  type = string
  sensitive = true
}

variable "supabase_organization_id" {
  type = string
}

variable "supabase_database_password" {
  type = string
  sensitive = true
}

variable "supabase_region" {
  type = string
}