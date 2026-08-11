terraform {
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
      version = ">= 4.8"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.11"
    }
  }
}
