-- =====================================================================
-- Migration 4 — Abandoned carts / partial leads
-- Run this in the Supabase SQL editor (after migrations 1 & 2).
-- Captures visitors who started filling the order form but didn't submit,
-- so you can follow up with them from the admin panel.
-- =====================================================================

create table if not exists abandoned_carts (
  id             uuid primary key default gen_random_uuid(),
  lead_id        text unique not null,               -- stable client-generated id
  customer_name  text,
  customer_phone text,
  address_line   text,
  area           text,
  product_id     uuid references products(id) on delete set null,
  product_name   text,
  quantity       int default 1,
  value          numeric(12,2) default 0,
  status         text not null default 'abandoned',  -- 'abandoned' | 'converted'
  order_id       uuid references orders(id) on delete set null,
  order_number   text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists idx_abandoned_status  on abandoned_carts(status);
create index if not exists idx_abandoned_updated on abandoned_carts(updated_at desc);
create index if not exists idx_abandoned_phone   on abandoned_carts(customer_phone);

-- keep updated_at fresh (reuses the shared trigger fn from the base schema)
drop trigger if exists trg_abandoned_updated on abandoned_carts;
create trigger trg_abandoned_updated before update on abandoned_carts
  for each row execute function set_updated_at();

-- Server-only access. Your Server Actions use the SERVICE ROLE key (bypasses RLS);
-- no anon policies are added, so the public cannot read/write this table directly.
alter table abandoned_carts enable row level security;
