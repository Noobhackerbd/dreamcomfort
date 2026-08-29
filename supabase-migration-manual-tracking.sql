-- Migration: manual/chat-order conversion tracking
-- Adds the two columns fireOrderConversion() uses to (a) tell manual/chat orders
-- apart from website orders, and (b) guarantee each order's server Purchase is sent
-- to Meta CAPI / TikTok EAPI AT MOST ONCE (de-duplication).
--
-- Safe to run more than once (IF NOT EXISTS). No data is changed for existing rows:
-- old orders default to is_manual = false (so they're never retro-sent) and
-- capi_sent = false.
--
-- Run this in Supabase → SQL Editor once. The feature still works without it
-- (on_create mode fires immediately via assumeManual), but the "confirm" and
-- "24h fallback" modes need these columns to de-duplicate correctly.

alter table orders add column if not exists is_manual boolean not null default false;
alter table orders add column if not exists capi_sent boolean not null default false;

-- Helps the 24h cron fallback find un-sent manual orders quickly.
create index if not exists orders_manual_unsent_idx
  on orders (created_at)
  where is_manual = true and capi_sent = false;
