# Infrastructure as Code (Terraform)

The `terraform` directory contains the Terraform configurations for provisioning and managing all cloud infrastructure for the **Money Collection App**.

## Overview & Role

- **Multi-Cloud Provisioning**: Declaratively manages resources across multiple cloud providers:
  - **Supabase**: Cloud PostgreSQL database project and authentication service.
  - **Upstash**: Global serverless Redis database for fast API caching.
  - **Vercel**: Next.js project creation, environment variable injection, and automated frontend deployment.
  - **AWS**: Database backup bucket, a shared API Gateway HTTP API, private image-search uploads on S3, a DynamoDB job store, TypeScript API and Python processing Lambdas, a read-only collection-chat TypeScript Lambda, and IAM OIDC policies for GitHub Actions deployments.
- **Environment Management**: `environments/shared`, `environments/dev`, and `environments/prod` are explicit root modules, each pinned to its corresponding Terraform Cloud workspace. Dev and prod consume shared Vercel and Redis outputs through the shared workspace.
- **Bootstrap Module**: The `terraform/bootstrap/` subfolder establishes the initial AWS OpenID Connect (OIDC) identity provider and GitHub Actions IAM role for passwordless deployment and backup access in the `bootstrap` workspace.

## Layout

```text
repository/
├── lambdas/
│   ├── image-search-api/        # TypeScript API Gateway handler
│   ├── collection-chat-api/     # TypeScript read-only collection chatbot
│   └── image-search-processor/  # Python S3-triggered processor
└── terraform/
    ├── environments/
    │   ├── shared/    # Shared Vercel project + Upstash Redis; workspace: shared
    │   ├── dev/       # Dev root module; Terraform Cloud workspace: dev
    │   └── prod/      # Prod root module; Terraform Cloud workspace: prod
    ├── modules/
    │   ├── application/     # Environment composition module
    │   ├── api/                # API Gateway and feature modules
    │   │   ├── api_gateway/    # Shared HTTP API and stage
    │   │   ├── image_search/   # Image-search AWS infrastructure
    │   │   └── collection_chat/ # Collection chatbot AWS infrastructure
    │   ├── database/        # Supabase project and API keys
    │   ├── backup/          # AWS S3 backup and IAM resources
    │   └── frontend/        # Vercel variables and deployments
    └── bootstrap/        # One-time GitHub Actions OIDC setup; workspace: bootstrap
```

Run Terraform from the environment directory you intend to deploy. The selected directory determines both the fixed environment configuration and the Terraform Cloud workspace.

Apply the `shared` root before `dev` or `prod` during initial setup or after shared infrastructure changes. The shared root owns the single Vercel project and Upstash Redis database; dev and prod own their respective resources and consume shared outputs.

## Image search

Each environment provisions its own private upload bucket, DynamoDB job table, TypeScript API Lambda, Python processing Lambda, and versioned HTTP API routes under `/v1/image-searches`. The browser authenticates with its Supabase access token; the API validates it against Supabase Auth before accessing the user's jobs. Uploads use short-lived S3 presigned POST forms constrained to JPEG/PNG files up to 5 MiB. An S3 object-created event starts Textract OCR, Amazon Bedrock banknote identification, and a Numista catalog search. Active jobs are polled by the frontend; image objects and job records expire after three days.

View the [image-search AWS architecture diagram](./image-search-architecture.html). It uses the official AWS Architecture Icons through the AWS Labs Mermaid icon pack; opening the HTML file requires internet access to load Mermaid and the icon pack.

The current default model is `amazon.nova-lite-v1:0`, a low-cost Bedrock model supporting image input. Confirm model availability/access and pricing in the target region before applying. The API endpoint is exposed as the Terraform output `image_search_api_url` and configured on Vercel as `NEXT_PUBLIC_IMAGE_SEARCH_API_URL`. For local frontend development, set that variable to the environment API URL in `frontend/.env.local`; use a valid signed-in Supabase account.

The processor retries failed asynchronous invocations up to two times and records job failures in DynamoDB; details are also available in CloudWatch Logs. API calls and uploads require a deployed AWS environment; local Redis does not emulate this service.

Lambda source is kept outside Terraform in the repository-root `lambdas/` directory. The API Gateway handlers are TypeScript/Node.js and bundled with esbuild; the S3-triggered image processor remains Python. Before running Terraform locally, build the API packages from `lambdas/image-search-api` and `lambdas/collection-chat-api` with `npm ci && npm run typecheck && npm run build` (the chat package also has `npm test`). Terraform packages all Lambda handlers from `lambdas/`, and the deploy workflow builds both TypeScript API bundles before Terraform validation and apply.

The GitHub Actions deployment role is provisioned by `terraform/bootstrap` and requires project-scoped permissions for the image-search bucket, DynamoDB table, Lambda functions, API Gateway, and collection-chat Secrets Manager secret. When introducing these resources to an account, apply the updated bootstrap policy first with credentials authorized to update the bootstrap IAM role (`./bootstrap.sh`), then rerun the environment deployment. The environment deployment role cannot grant itself additional AWS permissions.

## Collection chatbot

The floating Collection Assistant calls `POST /v1/chat` on the existing HTTP API and authenticates each request with the signed-in user's Supabase access token. A separate TypeScript Lambda uses Amazon Bedrock to translate natural-language questions into one SQL `SELECT`, validates the parsed SQL against a strict function/table allowlist, and executes it in a PostgreSQL read-only transaction as the `authenticated` role. The `chatbot_my_banknotes` invoker-security view exposes only the current user's collection. Results are limited to 100 rows and each query has a five-second statement timeout; Bedrock then formats a Markdown answer and up to three suggested follow-up questions based only on those rows. For questions about an individual note, the assistant identifies it using available denomination, currency, country, and year details, and includes its front/back images when their database URLs are available.

The chatbot Lambda connects to the Supabase transaction pooler over TLS and reads the database password from an environment-specific AWS Secrets Manager secret. The pooler presents a certificate chain that is not trusted by the Lambda's Node.js runtime, so the `pg` client requires TLS encryption but does not verify the server certificate (equivalent to Supabase's documented `sslmode=require`, not `verify-full`). Terraform manages the database password secret from the existing `supabase_database_password` input; its value is therefore also present in Terraform state, which must remain access-controlled. Apply the `supabase/migrations/20261103210000_chatbot_collection_view.sql` and `supabase/migrations/20261104000000_chatbot_banknote_images.sql` migrations before enabling chatbot traffic; the latter adds the front/back image URLs to the chatbot view. Markdown images in answers are restricted to HTTP(S) URLs returned by the query. The same API URL already configured as `NEXT_PUBLIC_IMAGE_SEARCH_API_URL` is used by the chatbot UI.

Build and test the chatbot Lambda from `lambdas/collection-chat-api` with `npm ci && npm run typecheck && npm test && npm run build`. The deploy workflow builds both TypeScript API Lambdas. Update and apply the `terraform/bootstrap` GitHub Actions policy before deploying the new Lambda and Secrets Manager resources.

Terraform keeps the API Gateway itself in the shared `api_gateway` module, while `image_search` and `collection_chat` own only their respective integrations, routes, Lambdas, and supporting resources. State move declarations in `application` preserve the existing API Gateway and stage during this module refactor.
