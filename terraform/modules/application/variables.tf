variable "environment" {
  description = "The fixed environment represented by the calling root module."
  type        = string

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be either dev or prod."
  }
}

variable "github_repo" { type = string }
variable "aws_resource_prefix" { type = string }
variable "supabase_project_name" { type = string }
variable "supabase_organization_id" { type = string }
variable "supabase_database_password" {
  type      = string
  sensitive = true
}
variable "supabase_region" { type = string }
variable "vercel_project_id" { type = string }
variable "redis_rest_url" { type = string }
variable "redis_rest_token" {
  type      = string
  sensitive = true
}
variable "vercel_project_directory" {
  type    = string
  default = "../../../frontend"
}
variable "numista_api_key" {
  type      = string
  sensitive = true
}
variable "exchangerates_api_key" {
  type      = string
  sensitive = true
}
variable "rest_countries_api_key" {
  type      = string
  sensitive = true
}
