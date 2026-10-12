# KOHAUS Frontend + Dashboard

The configured application stores leads, properties, clients, visits, users and property photos in Supabase. Vitest uses an isolated local test mode so the automated suite never changes production data.

## Supabase setup

1. Create a Supabase project.
2. In the SQL editor, run [supabase/schema.sql](./supabase/schema.sql).
3. Copy [.env.example](./.env.example) to `.env.local`.
4. Fill:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_SUPABASE_PROPERTY_MEDIA_BUCKET=property-media
```

5. Create at least one auth user in Supabase Authentication. Existing and future users are provisioned automatically in `dashboard_users` with role `admin` when the schema runs.
6. Start the app with:

```bash
npm install
npm run dev
```

## Current data model

- `owner_leads`: owner capture requests from the website form
- `dashboard_properties`: internal property records, notes, history, and photo metadata
- `dashboard_clients`: internal buyer and tenant profiles
- `dashboard_visits`: visits linked to clients, properties or owner leads
- `dashboard_users`: internal users auto-provisioned from Supabase Auth with admin access
- `property-media` bucket: property images uploaded from the dashboard

## Notes

- When Supabase is active, the public site can still submit owner leads, but the internal dashboard only opens for authenticated users that exist in Supabase Auth.
- The current setup auto-provisions every internal auth user as `admin`, so keep public signup disabled unless you want every new signup to gain dashboard access.
- Property photo upload is now available inside the dashboard property form.
- The dashboard is split into `Resumo`, `Leads`, and `Imóveis` for cleaner internal operation.
- Vitest runs in forced local mode so tests do not depend on the real Supabase project.
