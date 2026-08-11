variable "organization_id" { type = string }
variable "project_name" { type = string }
variable "database_password" {
  type      = string
  sensitive = true
}
variable "region" { type = string }
