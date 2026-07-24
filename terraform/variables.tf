# --- Upstash Redis ---
variable "redis_database_name" {
  type = string
}

variable "redis_region" {
  type = string
}

variable "upstash_email" {
  type = string
}

variable "upstash_api_key" {
  type = string
  sensitive = true
}

# --- SUPABASE --- 
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