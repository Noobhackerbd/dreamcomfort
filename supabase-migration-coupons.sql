-- Coupons / discount codes (used on the store checkout — NOT the landing funnel).

create table if not exists coupons (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  type        text not null default 'percent',   -- 'percent' | 'flat'
  value       numeric(10,2) not null default 0,   -- percent (e.g. 10) or flat taka (e.g. 100)
  min_order   numeric(10,2) not null default 0,   -- minimum cart subtotal to qualify
  expires_at  timestamptz,                        -- null = never expires
  usage_limit int,                                -- null = unlimited
  used_count  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

-- Remember which coupon an order used.
alter table orders add column if not exists coupon_code text;
