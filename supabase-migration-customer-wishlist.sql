-- Account-synced wishlist. Guests keep a localStorage wishlist; once logged in the
-- heart also writes here, and the dashboard shows the saved products across devices.

create table if not exists customer_wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);

alter table customer_wishlist enable row level security;

drop policy if exists "own wishlist" on customer_wishlist;
create policy "own wishlist" on customer_wishlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
