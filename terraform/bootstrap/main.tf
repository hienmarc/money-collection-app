terraform {
  cloud {
    organization = "money-collection-app-org"
    workspaces {
      name = "bootstrap"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
