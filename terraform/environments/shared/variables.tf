variable "upstash_email" { type = string }
variable "upstash_api_key" {
  type      = string
  sensitive = true
}
variable "redis_database_name" { type = string }
variable "redis_region" { type = string }
variable "vercel_api_token" {
  type      = string
  sensitive = true
}
variable "vercel_project_name" { type = string }
