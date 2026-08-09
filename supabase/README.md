# Supabase Backend & Database

The `supabase` directory contains the database migration scripts, table schemas, seed data, and Supabase configuration for the **Money Collection App**.

## Overview & Role

- **Database Schema**: Defines core entities including `banknotes`, `currencies` and `countries`, along with custom enum types such as banknote grading scales (`G`, `VG`, `F`, `VF`, `XF`, `AU`, `UNC`).
- **Security & Multi-Tenancy**: Implements PostgreSQL Row Level Security (RLS) policies (`"ownerid" = "auth"."uid"()`) to ensure private collection item isolation across users.
- **Local Seed Data**: Provides `supabase/seed.sql` containing preconfigured test accounts and sample banknote inventory data automatically populated during local development (`supabase start` or `supabase db reset`).
- **Migration Management**: Stores schema changes in `supabase/migrations/` which are executed locally via Supabase CLI (`supabase db push`) or automatically applied to cloud environments via GitHub Actions CI/CD (`Supabase Push Migrations` job in `.github/workflows/deploy.yml`).
