# --- General ---
variable "deployment_environment" {
  description = "The deployment environment ('dev' or 'prod')."
  type        = string
  default     = "dev"
}

variable "github_repo" {
  description = "The GitHub repository in the format 'owner/repo'."
  type        = string
}

# --- AWS ---
variable "aws_region" {
  description = "The AWS region to deploy resources."
  type        = string
  default     = "us-east-1"
}

variable "aws_resource_prefix" {
  description = "Prefix for project's resources. Used for filter IAM policies."
  type        = string
}

# --- Upstash Redis ---
variable "redis_database_name" {
  description = "The name of the Upstash Redis database to be created."
  type = string
}

variable "redis_region" {
  description = "The region where the Upstash Redis database will be created."
  type = string
}

variable "upstash_email" {
  description = "Upstash email for authentication."
  type = string
}

variable "upstash_api_key" {
  description = "Upstash API key for authentication."
  type = string
  sensitive = true
}

# --- SUPABASE --- 
variable "supabase_project_name" {
  description = "The name of the Supabase project to be created."
  type = string
}

variable "supabase_access_token" {
  description = "Supabase access token for authentication."
  type = string
  sensitive = true
}

variable "supabase_organization_id" {
  description = "The ID of the Supabase organization where the project will be created."
  type = string
}

variable "supabase_database_password" {
  description = "The password for the Supabase database."
  type = string
  sensitive = true
}

variable "supabase_region" {
  description = "The region where the Supabase project will be created."
  type = string
}

# --- VERCEL ---
variable "vercel_api_token" {
  description = "Vercel API token for authentication."
  type = string
  sensitive = true
}

variable "vercel_project_name" {
  description = "Name of the Vercel project."
  type        = string
  default     = "money-collection-app" # todo remove default
}

# --- Third-party APIs ---
variable "numista_api_key" {
  description = "API key for Numista API."
  type        = string
  sensitive   = true
}

variable "exchangerates_api_key" {
  description = "API key for Exchange Rates API."
  type        = string
  sensitive   = true
}

variable "rest_countries_api_key" {
  description = "API key for REST Countries API."
  type        = string
  sensitive   = true
}
