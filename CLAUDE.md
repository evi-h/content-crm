# Content Manager CRM

## What This App Does
A CRM for content managers to manage client businesses and create/schedule Instagram content using AI (Claude API).

## Stack
- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Storage)
- Anthropic SDK (claude-sonnet-4-5)
- Deployed on Vercel

## Folder Structure
/app                    → Next.js pages and API routes
/app/dashboard          → Main home (business table)
/app/dashboard/[id]     → Business workspace
/app/api/               → Server-side API routes (Claude, Instagram)
/components/            → Shared React components
/components/ui/         → shadcn/ui components (don't edit)
/lib/supabase.ts        → Supabase client
/lib/claude.ts          → Anthropic client
/types/                 → TypeScript types

## Key Conventions
1. Always use server components by default; add "use client" only when needed
2. Never expose API keys to the client — all Claude + Instagram calls go through /api routes
3. Use Supabase RLS — every table has row-level security by user_id
4. Forms: react-hook-form + zod for all validation
5. Loading states: every async action needs a loading spinner
6. Errors: always show user-friendly error messages (not raw error objects)
7. Use TypeScript strictly — no 'any' types

## Environment Variables (never hardcode these)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY    ← server only
ANTHROPIC_API_KEY            ← server only

## Database Tables
- businesses (id, user_id, name, instagram_handle, logo_url, industry, brand_tone, brand_voice_notes)
- posts (id, business_id, caption, image_url, platform, scheduled_at, status, brief)

## Current MVP Scope
- Single user (no teams yet)
- Instagram only (other platforms later)
- Schedule posts (direct publishing in Phase 2)
- AI: caption generation only (image gen later)

## Testing

### Run tests
- `npm test` — vitest unit + integration (fast, no browser)
- `npm run test:watch` — vitest in watch mode
- `npm run test:coverage` — coverage report
- `npm run test:e2e` — Playwright E2E (requires `npm run dev` or uses webServer)
- `npm run test:e2e:ui` — Playwright interactive UI

### Folder layout
```
tests/
  unit/           → Pure function tests (buildSystemPrompt, factories)
  integration/    → API route handler tests (NextRequest → handler → assert)
    api/
      generate-caption.test.ts
      instagram/
        verify-token.test.ts
        connect.test.ts
        publish.test.ts
    auth/
      rls.test.ts   ← requires local Supabase (supabase start)
  e2e/            → Playwright browser tests
  mocks/          → MSW server + handlers (anthropic, instagram)
  helpers/        → factories.ts, supabase-test-client.ts
  setup.ts        → jest-dom + MSW lifecycle
```

### Factory pattern
Use `createBusiness()`, `createPost()`, `createInstagramConnection()`, `createUser()` from `tests/helpers/factories.ts` for consistent test data. Pass overrides as needed.

### Subset runs
- `npx vitest run tests/unit` — unit only
- `npx vitest run tests/integration` — integration only

### RLS tests (.env.test required)
Copy `.env.test` and fill in local Supabase keys. Run `supabase start` first. RLS tests auto-skip if URL is not localhost.

## What NOT To Do
- Don't add new npm packages without asking
- Don't modify /components/ui/ files (shadcn managed)
- Don't add multi-tenant features yet
- Don't build image generation yet
