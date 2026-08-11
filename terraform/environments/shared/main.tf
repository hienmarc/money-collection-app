terraform {
  cloud {
    organization = "money-collection-app-org"
    workspaces { name = "shared" }
  }

  required_providers {
    upstash = { source = "upstash/upstash", version = "~> 1.5" }
    vercel  = { source = "vercel/vercel", version = ">= 4.8" }
  }
}

provider "upstash" {
  email   = var.upstash_email
  api_key = var.upstash_api_key
}

provider "vercel" { api_token = var.vercel_api_token }

resource "upstash_redis_database" "money_collection_app" {
  database_name  = var.redis_database_name
  region         = "global"
  primary_region = var.redis_region
  tls            = true
  eviction       = true
}

resource "vercel_project" "money_collection_app" {
  name      = var.vercel_project_name
  framework = "nextjs"
}
