# Supabase Backend & Database

The `supabase` directory contains the database migration scripts, table schemas, seed data, and Supabase configuration for the **Money Collection App**.

## Overview & Role

- **Database Schema**: Defines core entities including `banknotes`, `currencies` and `countries`, along with custom enum types such as banknote grading scales (`G`, `VG`, `F`, `VF`, `XF`, `AU`, `UNC`).
- **Security & Multi-Tenancy**: Implements PostgreSQL Row Level Security (RLS) policies (`"ownerid" = "auth"."uid"()`) to ensure private collection item isolation across users.
- **Local Seed Data**: Provides `supabase/seed.sql` containing preconfigured test accounts and sample banknote inventory data automatically populated during local development (`supabase start` or `supabase db reset`).
- **Migration Management**: Stores schema changes in `supabase/migrations/`, applied locally with `npx supabase migration up --local` and pushed to the linked cloud project with `npx supabase db push` (also used by the deployment workflow).

## Access control

Signed-in users can read `countries`, `currencies`, and `currencycountry`; admins can also modify them.

New profiles default to non-admin. To grant or revoke admin access, run [`scripts/set-user-admin.sql`](scripts/set-user-admin.sql) from a privileged SQL client, using the user's Auth UUID.

## Database migrations

Create database changes with the Supabase CLI and commit the generated migration:

```bash
cd supabase
npx supabase migration new descriptive_change_name
```

The catalog admin policies and profile-column protections are defined in the migration named `*_catalog_admin_rls.sql`. Never use a client-side `service_role` key to manage shared data.

## Seed accounts

The local seed creates these accounts with password `password123`:

| Email | Profile name | Access |
| :--- | :--- | :--- |
| `test@example.com` | Test Admin User | Admin |
| `alice@example.com` | Alice Numismatist | Regular user |
| `bob@example.com` | Bob Private | Regular user |

The test admin account is granted `is_admin = true` in the seed. Other seed accounts are explicitly regular users.
