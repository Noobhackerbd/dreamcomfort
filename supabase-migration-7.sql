-- =====================================================================
-- Migration 7 — Auto CarryBee + label printing
-- Run in the Supabase SQL editor (after migrations 1, 2, 4, 5, 6).
-- Tracks whether an order's CarryBee label has been auto-printed yet, so the
-- Print Station only prints each label once.
-- =====================================================================

alter table orders add column if not exists label_printed boolean not null default false;

create index if not exists idx_orders_print_queue
  on orders(courier, label_printed) where courier = 'CarryBee';
