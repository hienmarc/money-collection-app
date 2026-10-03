# Infrastructure as Code (Terraform)

The `terraform` directory contains the Terraform configurations for provisioning and managing all cloud infrastructure for the **Money Collection App**.

## Overview & Role

- **Multi-Cloud Provisioning**: Declaratively manages resources across multiple cloud providers:
  - **Supabase**: Cloud PostgreSQL database project and authentication service.
  - **Upstash**: Global serverless Redis database for fast API caching.
  - **Vercel**: Next.js project creation, environment variable injection, and automated frontend deployment.
  - **AWS**: Database backup bucket, private image-search uploads on S3, a DynamoDB job store, TypeScript API and Python processing Lambdas, and an extensible API Gateway HTTP API, plus IAM OIDC policies for GitHub Actions deployments.
- **Environment Management**: `environments/shared`, `environments/dev`, and `environments/prod` are explicit root modules, each pinned to its corresponding Terraform Cloud workspace. Dev and prod consume shared Vercel and Redis outputs through the shared workspace.
- **Bootstrap Module**: The `terraform/bootstrap/` subfolder establishes the initial AWS OpenID Connect (OIDC) identity provider and GitHub Actions IAM role for passwordless deployment and backup access in the `bootstrap` workspace.

## Layout

```text
repository/
├── lambdas/
│   ├── image-search-api/        # TypeScript API Gateway handler
│   └── image-search-processor/  # Python S3-triggered processor
└── terraform/
    ├── environments/
    │   ├── shared/    # Shared Vercel project + Upstash Redis; workspace: shared
    │   ├── dev/       # Dev root module; Terraform Cloud workspace: dev
    │   └── prod/      # Prod root module; Terraform Cloud workspace: prod
    ├── modules/
    │   ├── application/  # Environment composition module
    │   ├── database/     # Supabase project and API keys
    │   ├── backup/       # AWS S3 backup and IAM resources
    │   ├── image_search/ # Image-search AWS infrastructure
    │   └── frontend/     # Vercel variables and deployments
    └── bootstrap/        # One-time GitHub Actions OIDC setup; workspace: bootstrap
```

Run Terraform from the environment directory you intend to deploy. The selected directory determines both the fixed environment configuration and the Terraform Cloud workspace.

Apply the `shared` root before `dev` or `prod` during initial setup or after shared infrastructure changes. The shared root owns the single Vercel project and Upstash Redis database; dev and prod own their respective resources and consume shared outputs.

## Image search

Each environment provisions its own private upload bucket, DynamoDB job table, TypeScript API Lambda, Python processing Lambda, and versioned HTTP API routes under `/v1/image-searches`. The browser authenticates with its Supabase access token; the API validates it against Supabase Auth before accessing the user's jobs. Uploads use short-lived S3 presigned POST forms constrained to JPEG/PNG files up to 5 MiB. An S3 object-created event starts Textract OCR, Amazon Bedrock banknote identification, and a Numista catalog search. Active jobs are polled by the frontend; image objects and job records expire after three days.

The current default model is `amazon.nova-lite-v1:0`, a low-cost Bedrock model supporting image input. Confirm model availability/access and pricing in the target region before applying. The API endpoint is exposed as the Terraform output `image_search_api_url` and configured on Vercel as `NEXT_PUBLIC_IMAGE_SEARCH_API_URL`. For local frontend development, set that variable to the environment API URL in `frontend/.env.local`; use a valid signed-in Supabase account.

The failure-destination SQS queue retains exhausted Lambda events for diagnostics. API calls and uploads require a deployed AWS environment; local Redis does not emulate this service.

Lambda source is kept outside Terraform in the repository-root `lambdas/` directory. The API Gateway handler is TypeScript/Node.js, bundled with esbuild and the AWS SDK packages into `lambdas/image-search-api/dist/handler.js`; the S3-triggered image processor remains Python. Before running Terraform locally, build the API package from `lambdas/image-search-api` with `npm ci && npm run typecheck && npm run build`. Terraform packages both handlers from `lambdas/`, and the deploy workflow builds the API bundle before Terraform validation and apply.
