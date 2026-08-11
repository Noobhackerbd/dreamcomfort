-- Migration 8: track WHEN a label was printed, so the Print Station can show a
-- daily "products printed" tally (resets each day). Safe to run multiple times.

alter table orders add column if not exists label_printed_at timestamptz;

-- Speeds up the "printed today" lookup.
create index if not exists idx_orders_printed_at
  on orders(label_printed_at)
  where label_printed_at is not null;
