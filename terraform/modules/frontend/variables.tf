variable "environment" { type = string }
variable "project_id" { type = string }
variable "project_directory" { type = string }
variable "supabase_project_id" { type = string }
variable "supabase_anon_key" {
  type      = string
  sensitive = true
}
variable "redis_rest_url" { type = string }
variable "redis_rest_token" {
  type      = string
  sensitive = true
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
