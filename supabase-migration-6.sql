-- =====================================================================
-- Migration 6 — Site visitor tracking (daily visitors)
-- Run in the Supabase SQL editor (after migrations 1, 2, 4, 5).
-- Records one lightweight row per visitor session so the dashboard can show
-- daily visitor numbers. Server-only (service role); no anon access.
-- =====================================================================

create table if not exists page_visits (
  id          uuid primary key default gen_random_uuid(),
  visitor_id  text,
  path        text,
  created_at  timestamptz default now()
);

create index if not exists idx_visits_created on page_visits(created_at desc);
create index if not exists idx_visits_visitor on page_visits(visitor_id);

alter table page_visits enable row level security;
