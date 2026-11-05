variable "environment" { type = string }
variable "resource_prefix" { type = string }
variable "api_id" { type = string }
variable "api_execution_arn" { type = string }
variable "supabase_project_id" { type = string }
variable "supabase_region" { type = string }
variable "supabase_anon_key" {
  type      = string
  sensitive = true
}
variable "supabase_db_password" {
  type      = string
  sensitive = true
}
variable "bedrock_model_id" {
  type        = string
  description = "Bedrock model used by the collection assistant."
  default     = "amazon.nova-lite-v1:0"
}
