terraform {
  cloud {
    organization = "money-collection-app-org"

    workspaces {
      name = "dev"
    }
  }

  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.5"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "5.10.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    tfe = {
      source  = "hashicorp/tfe"
      version = "~> 0.55"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.11"
    }
  }
}

data "tfe_outputs" "bootstrap" {
  organization = "money-collection-app-org"
  workspace    = "money-collection-app-bootstrap"
}

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
      Environment = "dev"
    }
  }
}

provider "tfe" {}

module "application" {
  source = "../../modules/application"

  environment                = "dev"
  github_repo                = var.github_repo
  aws_resource_prefix        = var.aws_resource_prefix
  redis_database_name        = var.redis_database_name
  redis_region               = var.redis_region
  supabase_project_name      = var.supabase_project_name
  supabase_organization_id   = var.supabase_organization_id
  supabase_database_password = var.supabase_database_password
  supabase_region            = var.supabase_region
  vercel_project_name        = var.vercel_project_name
  numista_api_key            = var.numista_api_key
  exchangerates_api_key      = var.exchangerates_api_key
  rest_countries_api_key     = var.rest_countries_api_key
}
