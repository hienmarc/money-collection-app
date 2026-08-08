terraform {
  cloud {
    organization = "money-collection-app-org"
    workspaces {
      name = "money-collection-app-bootstrap"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}