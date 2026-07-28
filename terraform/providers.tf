provider "supabase" {
  access_token = var.supabase_access_token
}

provider "upstash" {
  email   = var.upstash_email
  api_key = var.upstash_api_key
}

provider "vercel" {
  api_token = var.vercel_api_token
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "money-collection-app"
      Environment = var.deployment_environment
    }
  }
}