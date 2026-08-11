# Infrastructure as Code (Terraform)

The `terraform` directory contains the Terraform configurations for provisioning and managing all cloud infrastructure for the **Money Collection App**.

## Overview & Role

- **Multi-Cloud Provisioning**: Declaratively manages resources across multiple cloud providers:
  - **Supabase**: Cloud PostgreSQL database project and authentication service.
  - **Upstash**: Global serverless Redis database for fast API caching.
  - **Vercel**: Next.js project creation, environment variable injection, and automated frontend deployment.
  - **AWS**: Database backup bucket on S3 and IAM OIDC policies for GitHub Actions deployments.
- **Environment Management**: `environments/dev` and `environments/prod` are explicit root modules. Each is pinned to its corresponding Terraform Cloud workspace, providing separate remote state without selecting an environment through `TF_WORKSPACE`.
- **Bootstrap Module**: The `terraform/bootstrap/` subfolder establishes the initial AWS OpenID Connect (OIDC) identity provider and GitHub Actions IAM role for passwordless deployment and backup access.

## Layout

```text
terraform/
├── environments/
│   ├── dev/       # Dev root module; Terraform Cloud workspace: dev
│   └── prod/      # Prod root module; Terraform Cloud workspace: prod
├── modules/
│   └── application/ # Shared Supabase, Upstash, Vercel, and AWS resources
└── bootstrap/     # One-time GitHub Actions OIDC setup
```

Run Terraform from the environment directory you intend to deploy. The selected directory determines both the fixed environment configuration and the Terraform Cloud workspace; do not set `TF_WORKSPACE`.
