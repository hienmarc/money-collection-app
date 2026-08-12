variable "organization_id" { type = string }
variable "project_name" { type = string }
variable "prevent_db_destroy" { type = bool }
variable "database_password" {
  type      = string
  sensitive = true
}
variable "region" { type = string }
