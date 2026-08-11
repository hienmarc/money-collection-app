locals {
  vercel_target = var.environment == "prod" ? "production" : "preview"
}
