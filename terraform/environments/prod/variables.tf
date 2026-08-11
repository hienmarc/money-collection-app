variable "github_repo" { type = string }
variable "aws_region" {
  type    = string
  default = "us-east-1"
}
variable "aws_resource_prefix" { type = string }
variable "redis_database_name" { type = string }
variable "redis_region" { type = string }
variable "upstash_email" { type = string }
variable "upstash_api_key" {
  type      = string
  sensitive = true
}
variable "supabase_project_name" { type = string }
variable "supabase_access_token" {
  type      = string
  sensitive = true
}
variable "supabase_organization_id" { type = string }
variable "supabase_database_password" {
  type      = string
  sensitive = true
}
variable "supabase_region" { type = string }
variable "vercel_api_token" {
  type      = string
  sensitive = true
}
variable "vercel_project_name" {
  type    = string
  default = "money-collection-app"
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
