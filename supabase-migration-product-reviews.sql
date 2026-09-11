-- Real customer reviews (with optional photos) for products. Submitted through a server
-- action (service-role insert), shown on the product page. Public can read approved ones.

create table if not exists product_reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  name       text,
  rating     int not null check (rating between 1 and 5),
  body       text,
  images     jsonb,                         -- array of public image URLs
  status     text default 'approved',       -- 'approved' | 'hidden'
  created_at timestamptz default now()
);

create index if not exists idx_product_reviews_product on product_reviews(product_id);

alter table product_reviews enable row level security;

drop policy if exists "read approved reviews" on product_reviews;
create policy "read approved reviews" on product_reviews for select using (status = 'approved');
-- Inserts/updates/deletes happen via the service-role key in server actions.
