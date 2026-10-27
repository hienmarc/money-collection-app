# Frontend

The `frontend` directory contains the web application user interface for the **Money Collection App**, built using **Next.js 14+** (App Router), **TypeScript**, **Tailwind CSS** and **shadcn/ui** components. 

## Overview & Role

- **User Experience**: Provides an interactive dashboard for banknote collectors to log inventory, view collection analytics, monitor overall collection value, browse country/currency details, and search banknotes on the Numista catalog.
- **Image Search**: Uploads JPEG/PNG images directly to the private S3 bucket using short-lived presigned forms. A TypeScript API Lambda and Python processing Lambda store OCR, AI identification, Numista matches, and job status; the image-search page polls for updates and lists recent searches. Lambda source lives in the repository-root `lambdas/` directory.
- **Data & Auth**: Integrates directly with Supabase via `@supabase/ssr` and `@supabase/supabase-js` for user authentication and PostgreSQL data management, while leveraging Upstash Redis for caching third-party API data.
- **Deployment**: Managed as a Next.js framework deployment on Vercel, configured and deployed automatically via the root Terraform configurations.

For local image-search use, set `NEXT_PUBLIC_IMAGE_SEARCH_API_URL` in `frontend/.env.local` to the `image_search_api_url` Terraform output for a deployed dev or prod environment. The API validates the signed-in user's Supabase session. Uploaded images and search records expire after three days.

## User roles

Admins can add, edit, and delete countries and currencies. Regular users can browse them and manage their own banknotes.
