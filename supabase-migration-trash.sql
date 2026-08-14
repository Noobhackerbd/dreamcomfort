-- Migration: order trash (soft delete)
-- Run once in Supabase → SQL Editor. Deleted orders go to trash instead of being
-- removed; they can be restored, or permanently deleted from the Trash tab.

alter table orders add column if not exists deleted_at timestamptz;
create index if not exists idx_orders_deleted on orders(deleted_at);
