-- Saved delivery addresses for logged-in customers (account dashboard).
-- Managed by server actions using the service-role key after verifying the session;
-- RLS additionally restricts any direct client access to the owner's own rows.

create table if not exists customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,                 -- "Home" / "Office" (optional)
  name text,
  phone text,
  address_line text,
  area text,
  city text,
  is_default boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_customer_addresses_user on customer_addresses(user_id);

alter table customer_addresses enable row level security;

drop policy if exists "own addresses" on customer_addresses;
create policy "own addresses" on customer_addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
