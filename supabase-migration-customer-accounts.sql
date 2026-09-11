-- Customer accounts (storefront login / dashboard). Customers authenticate through
-- Supabase Auth (email + password); this table holds their profile and links the auth
-- user to their phone number so "My Orders" can match orders (orders are keyed by phone).
--
-- Admin access stays protected separately by ADMIN_ALLOWED_EMAILS (see middleware.ts),
-- so a logged-in customer can never reach /admin.

create table if not exists customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_customer_profiles_phone on customer_profiles(phone);

-- Row-level security: the anon key is public, so lock the table down. Server actions use
-- the service-role key (bypasses RLS) for reads/writes after verifying the session; these
-- policies additionally let a signed-in customer read/update ONLY their own row directly.
alter table customer_profiles enable row level security;

drop policy if exists "own profile read" on customer_profiles;
create policy "own profile read" on customer_profiles for select using (auth.uid() = id);

drop policy if exists "own profile update" on customer_profiles;
create policy "own profile update" on customer_profiles for update using (auth.uid() = id);
