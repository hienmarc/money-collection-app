# --- General ---
variable "github_repo" {
  description = "The GitHub repository in the format 'owner/repo'."
  type        = string
}

variable "deployment_environment" {
  description = "The deployment environment ('dev' or 'prod')."
  type        = string
  default     = "dev"
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