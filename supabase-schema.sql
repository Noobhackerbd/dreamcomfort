-- =====================================================================
-- Dream Comfort BD — Supabase schema
-- Paste this whole file into: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (drops are guarded). Creates tables, enums, RLS, storage bucket, seed data.
-- =====================================================================

create extension if not exists "pgcrypto";  -- for gen_random_uuid()

-- ---------- ENUMS ----------
do $$ begin
  create type order_status as enum
    ('pending','confirmed','processing','shipped','delivered','cancelled','returned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cod');
exception when duplicate_object then null; end $$;

-- ---------- updated_at helper ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------- CATEGORIES ----------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name_en     text not null,
  name_bn     text,
  sort_order  int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
drop trigger if exists trg_categories_updated on categories;
create trigger trg_categories_updated before update on categories
  for each row execute function set_updated_at();

-- ---------- PRODUCTS ----------
create table if not exists products (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  name_en           text not null,
  name_bn           text,
  description_en    text,
  description_bn    text,
  price             numeric(12,2) not null default 0,
  compare_at_price  numeric(12,2),
  sku               text,
  stock             int not null default 0,
  category_id       uuid references categories(id) on delete set null,
  images            text[] default '{}',
  is_active         boolean not null default true,
  meta_title        text,
  meta_description  text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();
create index if not exists idx_products_active on products(is_active);
create index if not exists idx_products_category on products(category_id);

-- ---------- CUSTOMERS ----------
create table if not exists customers (
  id            uuid primary key default gen_random_uuid(),
  phone         text unique not null,
  name          text,
  email         text,
  total_orders  int default 0,
  total_spent   numeric(12,2) default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
drop trigger if exists trg_customers_updated on customers;
create trigger trg_customers_updated before update on customers
  for each row execute function set_updated_at();

-- ---------- ORDER NUMBER SEQUENCE (DC-10001, DC-10002, ...) ----------
create sequence if not exists order_number_seq start 10001;

-- ---------- ORDERS ----------
create table if not exists orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       text unique not null default ('DC-' || nextval('order_number_seq')::text),
  status             order_status not null default 'pending',
  customer_name      text not null,
  customer_phone     text not null,
  customer_email     text,
  address_line       text not null,
  area               text,
  city               text,
  district           text,
  postcode           text,
  payment_method     payment_method not null default 'cod',
  subtotal           numeric(12,2) not null default 0,
  shipping_fee       numeric(12,2) not null default 0,
  discount           numeric(12,2) not null default 0,
  total              numeric(12,2) not null default 0,
  notes              text,
  courier            text,
  tracking_id        text,
  -- Meta CAPI matching data captured at checkout:
  fbp                text,
  fbc                text,
  client_user_agent  text,
  client_ip          text,
  event_id           text,   -- shared between browser + server Purchase for dedup
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_phone on orders(customer_phone);
create index if not exists idx_orders_created on orders(created_at desc);

-- ---------- ORDER ITEMS ----------
create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  product_name  text not null,
  unit_price    numeric(12,2) not null,
  quantity      int not null default 1,
  line_total    numeric(12,2) not null,
  created_at    timestamptz default now()
);
create index if not exists idx_order_items_order on order_items(order_id);

-- ---------- SMS LOGS ----------
create table if not exists sms_logs (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid references orders(id) on delete set null,
  phone             text not null,
  message           text not null,
  provider_response text,
  status            text,          -- 'sent' | 'failed'
  created_at        timestamptz default now()
);

-- ---------- EVENTS LOG (tracking / dedup audit) ----------
create table if not exists events_log (
  id          uuid primary key default gen_random_uuid(),
  event_name  text not null,
  event_id    text,
  source      text not null,       -- 'browser' | 'server'
  fbtrace_id  text,
  payload     jsonb,
  created_at  timestamptz default now()
);
create index if not exists idx_events_created on events_log(created_at desc);
create index if not exists idx_events_eventid on events_log(event_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- Public may READ active catalog. Everything else is server-only
-- (your Server Actions / API routes use the SERVICE ROLE key, which bypasses RLS).
-- No anon client should ever write orders directly.
-- =====================================================================
alter table products    enable row level security;
alter table categories  enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table customers   enable row level security;
alter table sms_logs    enable row level security;
alter table events_log  enable row level security;

-- Public read of active products + categories
drop policy if exists "public read active products" on products;
create policy "public read active products" on products
  for select using (is_active = true);

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories
  for select using (true);

-- NOTE: no anon policies on orders/order_items/customers/sms_logs/events_log.
-- Writes happen only through the service-role key on the server. Admins read
-- via the service role too (gate the /admin UI with Supabase Auth + allow-listed email).

-- =====================================================================
-- STORAGE BUCKET for product images
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('product-images','product-images', true)
on conflict (id) do nothing;

-- Public can view images; only authenticated (admin) can upload/update/delete.
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "auth manage product images" on storage.objects;
create policy "auth manage product images" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

-- =====================================================================
-- SEED DATA (2 categories + sample comfort products)
-- =====================================================================
insert into categories (slug, name_en, name_bn, sort_order) values
  ('bedding','Bedding','বিছানাপত্র',1),
  ('pillows','Pillows & Cushions','বালিশ ও কুশন',2)
on conflict (slug) do nothing;

insert into products (slug, name_en, name_bn, description_en, price, compare_at_price, sku, stock, category_id, is_active)
select v.slug, v.name_en, v.name_bn, v.description_en, v.price, v.compare_at_price, v.sku, v.stock,
       (select id from categories where slug = v.cat), true
from (values
  ('premium-cotton-bedsheet','Premium Cotton Bedsheet','প্রিমিয়াম কটন বেডশিট','Soft 100% cotton king-size bedsheet with 2 pillow covers.',1450,1800,'DC-BS-001',50,'bedding'),
  ('luxury-comforter-set','Luxury Comforter Set','লাক্সারি কম্ফোর্টার সেট','Warm microfiber comforter, all-season, king size.',2990,3800,'DC-CF-001',30,'bedding'),
  ('waterproof-mattress-protector','Waterproof Mattress Protector','ওয়াটারপ্রুফ ম্যাট্রেস প্রোটেক্টর','Breathable, fitted, protects against spills.',1200,1500,'DC-MP-001',40,'bedding'),
  ('memory-foam-pillow','Memory Foam Pillow','মেমরি ফোম বালিশ','Ergonomic neck-support memory foam pillow.',890,1200,'DC-PL-001',80,'pillows'),
  ('fiber-cushion-set','Fiber Cushion Set (5 pcs)','ফাইবার কুশন সেট (৫টি)','Set of 5 soft decorative cushions.',990,1300,'DC-CU-001',60,'pillows'),
  ('cooling-gel-pillow','Cooling Gel Pillow','কুলিং জেল বালিশ','Gel-infused pillow for hot sleepers.',1350,1700,'DC-PL-002',35,'pillows')
) as v(slug,name_en,name_bn,description_en,price,compare_at_price,sku,stock,cat)
on conflict (slug) do nothing;

-- Done. Next: create your first admin user in Supabase Auth, then add its email to ADMIN_ALLOWED_EMAILS.
