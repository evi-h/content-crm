# Content CRM

A personal CRM for managing client businesses and creating Instagram posts with AI-generated captions.

**Live demo:** [content-crm-lilac.vercel.app](https://content-crm-lilac.vercel.app)

## What you can do

- Sign in or create an account (email + password)
- Add client businesses with industry, brand tone, Instagram handle, and logo
- Generate Instagram captions from a brief via a server-side Claude API (keys never reach the browser)
- Save drafts or schedule posts on a calendar
- Connect an Instagram Business/Creator account and publish a post when a connection is set up

This is an MVP: one user (no teams), Instagram only, captions only (no image generation). Scheduling is the main path; live publishing is optional once Instagram is connected.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · shadcn/ui · Zod · react-hook-form · Supabase (Postgres, Auth, Storage, RLS) · Anthropic SDK · Vitest · Playwright · MSW · Husky · Vercel

## Data model

Three tables, each with row-level security so a user only sees their own rows:

- **businesses** — clients (`user_id`, name, handle, logo, industry, brand tone, voice notes)
- **posts** — drafts, scheduled, or published Instagram posts (`business_id`, caption, image, schedule, status, brief)
- **instagram_connections** — per-business Graph API credentials (`user_id`, `business_id`, token, IG user id)

Sensitive calls (Claude, Instagram) go through `/app/api` routes.

## Local setup

```bash
git clone https://github.com/evi-h/content-crm.git
cd content-crm
npm install
```

Create `.env.local` (no `.env.example` in the repo):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are server-only.

You also need a Supabase project with the schema in `supabase/migrations.sql` (tables + RLS + Storage buckets `logos` and `post-images`).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test           # Vitest unit + integration (with coverage)
npm run test:e2e   # Playwright: client-management, post-scheduling, caption-generation
```

Husky runs the Vitest suite and coverage checks on every local commit. There is no GitHub Actions workflow. Vercel builds and deploys on push.
