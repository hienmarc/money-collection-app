# Infrastructure as Code (Terraform)

The `terraform` directory contains the Terraform configurations for provisioning and managing all cloud infrastructure for the **Money Collection App**.

## Overview & Role

- **Multi-Cloud Provisioning**: Declaratively manages resources across multiple cloud providers:
  - **Supabase**: Cloud PostgreSQL database project and authentication service.
  - **Upstash**: Global serverless Redis database for fast API caching.
  - **Vercel**: Next.js project creation, environment variable injection, and automated frontend deployment.
  - **AWS**: Database backup bucket on S3 and IAM OIDC policies for GitHub Actions deployments.
- **Environment Management**: Integrates with Terraform Cloud (`money-collection-app-org`) to manage remote state and variables across `dev` and `prod` environments.
- **Bootstrap Module**: The `terraform/bootstrap/` subfolder establishes the initial AWS OpenID Connect (OIDC) identity provider and GitHub Actions IAM role for passwordless deployment and backup access.
