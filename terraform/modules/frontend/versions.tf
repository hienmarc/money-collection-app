terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = ">= 4.8"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.11"
    }
  }
}
