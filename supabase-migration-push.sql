-- Migration: admin Web Push subscriptions
-- Run once in Supabase → SQL Editor. Stores each admin device's push subscription
-- so the server can notify them of new orders even when the site is closed.

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text unique not null,
  p256dh      text not null,
  auth        text not null,
  admin_email text,
  user_agent  text,
  created_at  timestamptz default now()
);

-- Only the service role (server) touches this table; enable RLS with no public policies.
alter table push_subscriptions enable row level security;
