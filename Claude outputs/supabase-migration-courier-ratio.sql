-- Optional: caches BD Courier "success ratio" lookups so the same phone number isn't
-- re-checked against the API on every order-list view (saves API quota + loads instantly,
-- and is shared across all your devices).
--
-- The feature works WITHOUT this table (it just always fetches live). Run it to enable caching.

create table if not exists courier_ratio_cache (
  phone      text primary key,           -- local BD number, 01XXXXXXXXX
  data       jsonb not null,             -- { total, success, cancelled, ratio, couriers[] }
  checked_at timestamptz not null default now()
);

-- Keep it tidy — this is a cache, not a source of truth.
create index if not exists idx_courier_ratio_cache_checked_at on courier_ratio_cache (checked_at);
