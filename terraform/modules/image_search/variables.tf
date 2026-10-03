variable "environment" { type = string }
variable "resource_prefix" { type = string }
variable "supabase_project_id" { type = string }
variable "supabase_anon_key" {
  type      = string
  sensitive = true
}
variable "numista_api_key" {
  type      = string
  sensitive = true
}
variable "bedrock_model_id" {
  type        = string
  description = "Lowest-cost Bedrock model with image input enabled in the target region."
  default     = "amazon.nova-lite-v1:0"
}
