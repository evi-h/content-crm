# Content Manager CRM — Full MVP Specification

## Overview

A focused CRM for content managers to manage client businesses and create AI-powered Instagram content.
The app is designed for a single user managing multiple client businesses. The core loop is simple:
see all your clients → click into one → create and schedule content with AI.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database + Auth + Storage:** Supabase
- **AI (caption generation):** Anthropic API using `claude-sonnet-4-6` model
- **Deployment:** Vercel
- **Forms:** react-hook-form + zod
- **Language:** TypeScript (strict mode, no `any` types)

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server-side only, never expose to client
ANTHROPIC_API_KEY                # server-side only, never expose to client
```

---

## Folder Structure

```
/app
  /login                         # Login page
  /dashboard                     # Home — business table
  /dashboard/[businessId]        # Business workspace
  /dashboard/[businessId]/settings  # Advanced settings (hidden from main nav)
  /api
    /generate-caption            # POST — calls Anthropic API server-side
/components
  /ui                            # shadcn/ui components (never edit these)
  /businesses                    # Business-related components
  /posts                         # Post/content-related components
  /layout                        # Nav, sidebar, wrappers
/lib
  supabase.ts                    # Supabase browser client
  supabase-server.ts             # Supabase server client (for server components)
  claude.ts                      # Anthropic SDK client
/types
  index.ts                       # All shared TypeScript types
/hooks
  useBusinesses.ts
  usePosts.ts
```

---

## Database Schema

Run these as SQL migrations in Supabase. Enable Row Level Security (RLS) on all tables.

### Table: `businesses`

```sql
create table businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  instagram_handle text,
  logo_url text,
  industry text,
  brand_tone text check (brand_tone in ('professional', 'casual', 'playful', 'bold')),
  brand_voice_notes text,
  created_at timestamptz default now()
);

-- RLS: users can only access their own businesses
alter table businesses enable row level security;
create policy "Users manage own businesses"
  on businesses for all
  using (auth.uid() = user_id);
```

### Table: `posts`

```sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  caption text,
  image_url text,
  platform text default 'instagram',
  scheduled_at timestamptz,
  status text default 'draft' check (status in ('draft', 'scheduled', 'published')),
  brief text,
  created_at timestamptz default now()
);

-- RLS: users can only access posts belonging to their businesses
alter table posts enable row level security;
create policy "Users manage own posts"
  on posts for all
  using (
    business_id in (
      select id from businesses where user_id = auth.uid()
    )
  );
```

### Supabase Storage

Create a public storage bucket called `logos` for business logo images.
Create a public storage bucket called `post-images` for post images.

---

## Authentication

- Use Supabase Auth with email + password
- Single user for MVP (no invite flow, no teams)
- `middleware.ts` must protect all routes under `/dashboard` and `/api`
- Unauthenticated users are redirected to `/login`
- After login, redirect to `/dashboard`
- Show a sign-out button in the top navigation bar

---

## Screen 1 — Login Page (`/login`)

- Clean centered card with app name/logo
- Email + password fields
- "Sign In" button with loading state
- Show inline error message on failed login (e.g. "Invalid email or password")
- No sign-up flow for MVP (single user — account created manually in Supabase dashboard)

---

## Screen 2 — Dashboard / Business Table (`/dashboard`)

This is the home screen. It shows all client businesses in a clean table.

### Layout
- Top navigation bar: app logo/name on the left, user avatar + sign out on the right
- Page title: "Your Clients"
- "+ Add Business" button top-right of the table

### Table Columns
1. **Logo** — circular avatar; show initials as fallback if no logo
2. **Business Name** — bold, primary text
3. **Instagram Handle** — shown as `@handle` in muted text; show "—" if not set
4. **Last Posted** — date of most recent post with status 'published'; show "Never" if none
5. **Next Scheduled** — date of next post with status 'scheduled'; show "None" if none
6. **Status** — badge: "Active" (green) if a post is scheduled, "Idle" (gray) otherwise

### Interactions
- Clicking any row navigates to `/dashboard/[businessId]`
- Rows have a hover state
- Table shows a loading skeleton while data is fetching
- Empty state: centered illustration area + message "No clients yet. Add your first one." + "+ Add Business" button

### Add Business Modal
Triggered by the "+ Add Business" button. A slide-over or centered modal with:

**Fields:**
- Business Name (text input, required)
- Instagram Handle (text input, optional — store without the `@`)
- Industry / Niche (text input, optional — e.g. "fitness", "e-commerce", "restaurant")
- Brand Tone (pill/toggle selector, pick one):
  - Professional
  - Casual
  - Playful
  - Bold
- Logo Upload (image upload, optional — uploads to Supabase Storage `logos` bucket)

**Behaviour:**
- Validate with zod: name is required, max 100 chars
- Show inline validation errors
- Loading state on submit button
- On success: close modal, new business appears in table immediately (optimistic update or re-fetch)
- On error: show toast notification "Failed to save. Please try again."

---

## Screen 3 — Business Workspace (`/dashboard/[businessId]`)

This is the main working screen. Default view is content creation.

### Top Bar
- Back arrow + "All Clients" link (navigates to `/dashboard`)
- Business logo (small circle) + Business Name
- View toggle: **[✍️ Create]** | **[📅 Calendar]** — pill toggle, Create is default
- Settings icon (⚙️) on the far right — links to `/dashboard/[businessId]/settings`

### View A: Create (default)

A focused content creation panel. Layout is a single centered column, max width ~680px.

**Step 1 — Brief**
- Label: "What's this post about?"
- Large textarea, placeholder: "e.g. We're launching a summer sale — 30% off everything this weekend only"
- Character hint: no limit, but suggest keeping it concise

**Step 2 — Generate**
- "✨ Generate Caption" button (primary, full width)
- On click: call `POST /api/generate-caption` with the brief and business context
- Show a loading state with animated dots while generating
- Stream the response — show text appearing word by word as Claude writes it
- If an error occurs, show: "Something went wrong. Please try again."

**Step 3 — Edit Caption**
- After generation, show the result in an editable textarea
- Label: "Your Caption"
- Show character count — Instagram optimal is under 150 chars; show a soft warning (not blocking) if over 2,200 chars (Instagram's limit)
- Platform tip shown below: "💡 Instagram tip: First line is most important — it shows before 'more'"

**Step 4 — Image**
- Optional image upload
- Label: "Add an Image (optional)"
- Drag-and-drop area or click to upload
- Accepted: JPG, PNG, WebP — max 10MB
- Preview thumbnail after upload
- Upload to Supabase Storage `post-images` bucket on submit (not on selection)

**Step 5 — Schedule**
- Label: "When should this go out?"
- Date picker + time picker
- Default: tomorrow at 9:00 AM
- Platform shown as a static badge: 📸 Instagram (not editable in MVP)

**Step 6 — Save**
- "Save to Calendar" button (primary)
- On click: insert post into `posts` table with status = 'scheduled'
- Show success toast: "Post scheduled! 🎉"
- Reset the form after success so user can create another post
- "Save as Draft" secondary button — same but status = 'draft', no date required

---

### View B: Calendar

Toggle from the top bar. Shows scheduled and published posts for this business.

**Layout:**
- Monthly calendar grid (Sun–Sat)
- Current month shown by default
- Previous/Next month navigation arrows
- "Today" button to jump back to current month

**Post Cards on Calendar:**
- Each scheduled/published post appears as a small colored card on its date
- Card shows: first 35 chars of caption + status color (blue = scheduled, green = published, gray = draft)
- If multiple posts on the same day, stack them (max 2 visible, "+N more" if more)

**Click on a Post Card:**
- Opens a modal showing full caption, image preview (if any), scheduled time, status
- Action buttons: "Edit" (opens edit form), "Delete" (with confirm dialog)
- Edit form is the same as the Create form but pre-filled

**No posts state:**
- Show message in the calendar area: "No posts scheduled yet. Switch to Create to make your first one."

---

## Screen 4 — Settings (`/dashboard/[businessId]/settings`)

Accessible via the ⚙️ icon in the workspace top bar. This is the "advanced" area — not in the main flow.

### Sections:

**1. Business Details**
- Edit all fields from the Add Business form (name, handle, industry, tone, logo)
- "Save Changes" button

**2. Brand Voice**
- Textarea for custom Claude instructions
- Label: "Custom AI Instructions"
- Placeholder: "e.g. Always write in first person. Use emojis sparingly. Never use the word 'delve'. Our audience is women aged 25–40."
- Helper text: "These instructions are added to every caption Claude generates for this business."
- "Save" button

**3. Connect Instagram (Phase 2 — build the UI now, disable functionality)**
- Section heading: "Instagram Publishing"
- Show a "Coming Soon" badge next to the heading
- Display a grayed-out step-by-step wizard showing what connecting will look like:
  - Step 1: Create a Meta Developer account
  - Step 2: Set up an Instagram Business account
  - Step 3: Generate an access token
  - Step 4: Paste token here to connect
- Each step has a number badge and plain English description
- "Connect Instagram" button — disabled for now, shows tooltip: "Coming in the next update"

**4. Danger Zone**
- "Delete Business" button (red, outlined)
- On click: show confirmation dialog — "Are you sure? This will permanently delete [Business Name] and all its posts. This cannot be undone."
- Two buttons in dialog: "Cancel" and "Yes, Delete" (red)
- On confirm: delete business from Supabase (cascade deletes posts), redirect to `/dashboard`

---

## API Route — `/api/generate-caption`

**Method:** POST  
**Auth:** Verify Supabase session server-side before proceeding. Return 401 if not authenticated.

**Request body:**
```json
{
  "brief": "string — the user's topic/brief",
  "businessName": "string",
  "industry": "string or null",
  "brandTone": "professional | casual | playful | bold | null",
  "brandVoiceNotes": "string or null"
}
```

**Behaviour:**
- Build a system prompt using the business context
- Call Anthropic API using `claude-sonnet-4-6` with streaming enabled
- Stream the response back to the client using Next.js streaming response

**System prompt template:**
```
You are a social media content writer for {{businessName}}.
{{#if industry}}The business operates in the {{industry}} industry.{{/if}}
Tone: {{brandTone}} (professional = formal and authoritative, casual = friendly and conversational, playful = fun with light humour, bold = confident and punchy).
{{#if brandVoiceNotes}}Additional brand instructions: {{brandVoiceNotes}}{{/if}}

You write Instagram captions only. Rules:
- Write in the brand's voice, not generically
- Lead with the most important message — it shows before "more"
- Keep it under 150 characters when possible, 2200 max
- Add 3–5 relevant hashtags at the end on a new line
- Do not use the word "delve"
- Do not add any preamble or explanation — output the caption only
```

**Error handling:**
- If Anthropic API fails: return 500 with `{ error: "Failed to generate caption" }`
- If request body is invalid: return 400 with `{ error: "Invalid request" }`

---

## TypeScript Types

```typescript
// /types/index.ts

export type BrandTone = 'professional' | 'casual' | 'playful' | 'bold'
export type PostStatus = 'draft' | 'scheduled' | 'published'
export type Platform = 'instagram'

export interface Business {
  id: string
  user_id: string
  name: string
  instagram_handle: string | null
  logo_url: string | null
  industry: string | null
  brand_tone: BrandTone | null
  brand_voice_notes: string | null
  created_at: string
}

export interface Post {
  id: string
  business_id: string
  caption: string | null
  image_url: string | null
  platform: Platform
  scheduled_at: string | null
  status: PostStatus
  brief: string | null
  created_at: string
}
```

---

## UI & Design Guidelines

- **Style:** Clean, minimal, professional. Think Notion meets Linear.
- **Colors:** White background, slate/gray text, indigo or violet as primary accent color
- **Components:** Use shadcn/ui for all UI primitives (Button, Input, Dialog, Table, Toast, Badge, Calendar, Popover)
- **Loading states:** Every async action must show a loading spinner or skeleton — never leave the user guessing
- **Error states:** Always show a user-friendly error message — never show raw error objects or stack traces
- **Empty states:** Every list/table must have a friendly empty state with a call to action
- **Toasts:** Use shadcn/ui Toast for success/error feedback on all create/update/delete actions
- **Responsive:** Desktop-first, but must be usable on tablet (min 768px). Mobile not required for MVP.

---

## Key Rules for Claude Code

1. Never expose `ANTHROPIC_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the client — all sensitive API calls go through `/api` routes
2. Always use Supabase RLS — never bypass it with the service role key on the client
3. Every form needs loading + error + success states
4. Use TypeScript strictly — define types in `/types/index.ts`, import them everywhere
5. Use `react-hook-form` + `zod` for all forms
6. Use server components by default; add `"use client"` only when state or browser APIs are needed
7. All shadcn/ui components live in `/components/ui/` — never modify them
8. After each major feature, verify it works before moving to the next

---

## Build Order

Build in this exact sequence. Complete and verify each step before moving to the next.

1. **Project setup** — Next.js 14, Tailwind, shadcn/ui, Supabase client, environment variables, middleware
2. **Auth** — Login page, Supabase auth, protected routes, sign out
3. **Database** — Run SQL migrations, set up RLS, create storage buckets
4. **Business table** — Dashboard page, fetch + display businesses, empty state, loading skeleton
5. **Add business modal** — Form, logo upload to Supabase Storage, insert to DB
6. **Workspace layout** — `/dashboard/[businessId]` page, top bar, Create/Calendar toggle, settings link
7. **Caption creator** — Brief input, call `/api/generate-caption`, stream response, edit textarea, character count
8. **Schedule & save** — Image upload, date/time picker, save to `posts` table, success toast
9. **Calendar view** — Monthly grid, render posts on dates, click to view/edit/delete
10. **Settings page** — Edit business details, brand voice notes, Instagram placeholder (disabled), delete business

---

## Out of Scope for MVP

Do not build these. They come after the MVP is validated:

- Instagram direct publishing (UI placeholder only)
- Image generation with AI
- Multiple users / team features
- Other platforms (LinkedIn, X, Facebook, TikTok)
- Analytics dashboard
- Post approval workflows
- Client portal
- Email/Slack notifications
- Mobile responsive design
