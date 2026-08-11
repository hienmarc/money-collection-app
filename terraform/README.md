# Infrastructure as Code (Terraform)

The `terraform` directory contains the Terraform configurations for provisioning and managing all cloud infrastructure for the **Money Collection App**.

## Overview & Role

- **Multi-Cloud Provisioning**: Declaratively manages resources across multiple cloud providers:
  - **Supabase**: Cloud PostgreSQL database project and authentication service.
  - **Upstash**: Global serverless Redis database for fast API caching.
  - **Vercel**: Next.js project creation, environment variable injection, and automated frontend deployment.
  - **AWS**: Database backup bucket on S3 and IAM OIDC policies for GitHub Actions deployments.
- **Environment Management**: `environments/shared`, `environments/dev`, and `environments/prod` are explicit root modules, each pinned to its corresponding Terraform Cloud workspace. Dev and prod consume shared Vercel and Redis outputs through the shared workspace.
- **Bootstrap Module**: The `terraform/bootstrap/` subfolder establishes the initial AWS OpenID Connect (OIDC) identity provider and GitHub Actions IAM role for passwordless deployment and backup access in the `bootstrap` workspace.

## Layout

```text
terraform/
├── environments/
│   ├── shared/    # Shared Vercel project + Upstash Redis; workspace: shared
│   ├── dev/       # Dev root module; Terraform Cloud workspace: dev
│   └── prod/      # Prod root module; Terraform Cloud workspace: prod
├── modules/
│   ├── application/ # Environment composition module
│   ├── database/    # Supabase project and API keys
│   ├── backup/      # AWS S3 backup and IAM resources
│   └── frontend/    # Vercel variables and deployments
└── bootstrap/       # One-time GitHub Actions OIDC setup; workspace: bootstrap
```

Run Terraform from the environment directory you intend to deploy. The selected directory determines both the fixed environment configuration and the Terraform Cloud workspace.

Apply the `shared` root before `dev` or `prod` during initial setup or after shared infrastructure changes. The shared root owns the single Vercel project and Upstash Redis database; dev and prod own their respective resources and consume shared outputs.
