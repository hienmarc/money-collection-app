# Frontend

The `frontend` directory contains the web application user interface for the **Money Collection App**, built using **Next.js 14+** (App Router), **TypeScript**, **Tailwind CSS** and **shadcn/ui** components. 

## Overview & Role

- **User Experience**: Provides an interactive dashboard for banknote collectors to log inventory, view collection analytics, monitor overall collection value, browse country/currency details, and search banknotes on the Numista catalog.
- **Data & Auth**: Integrates directly with Supabase via `@supabase/ssr` and `@supabase/supabase-js` for user authentication and PostgreSQL data management, while leveraging Upstash Redis for caching third-party API data.
- **Deployment**: Managed as a Next.js framework deployment on Vercel, configured and deployed automatically via the root Terraform configurations.
