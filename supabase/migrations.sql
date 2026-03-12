-- Run this in the Supabase SQL Editor

-- Table: businesses
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

alter table businesses enable row level security;
create policy "Users manage own businesses"
  on businesses for all
  using (auth.uid() = user_id);

-- Table: posts
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

alter table posts enable row level security;
create policy "Users manage own posts"
  on posts for all
  using (
    business_id in (
      select id from businesses where user_id = auth.uid()
    )
  );

-- Storage buckets: create manually in Supabase dashboard
-- 1. Create bucket: logos (public)
-- 2. Create bucket: post-images (public)

-- Storage RLS policies: logos
create policy "Authenticated users can upload logos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos');

create policy "Authenticated users can update logos"
  on storage.objects for update to authenticated
  using (bucket_id = 'logos');

create policy "Public can read logos"
  on storage.objects for select to public
  using (bucket_id = 'logos');

-- Storage RLS policies: post-images
create policy "Authenticated users can upload post-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images');

create policy "Authenticated users can update post-images"
  on storage.objects for update to authenticated
  using (bucket_id = 'post-images');

create policy "Public can read post-images"
  on storage.objects for select to public
  using (bucket_id = 'post-images');
