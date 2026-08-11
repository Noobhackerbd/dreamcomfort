-- =====================================================================
-- Migration 5 — Booked / scheduled orders
-- Run in the Supabase SQL editor (after migrations 1, 2, 4).
-- Lets you mark an order as "booked" (customer wants delivery later) and set
-- the delivery date. The admin gets an in-app reminder from 3 days before.
-- =====================================================================

alter table orders add column if not exists is_booked   boolean not null default false;
alter table orders add column if not exists booked_date date;

create index if not exists idx_orders_booked on orders(is_booked, booked_date);
