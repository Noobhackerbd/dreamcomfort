-- =====================================================================
-- Dream Comfort BD — Migration 2
-- Run this in Supabase → SQL Editor AFTER supabase-schema.sql.
-- Adds: settings table (shipping fees, store info, editable SMS templates).
-- Safe to re-run.
-- =====================================================================

-- ---------- SETTINGS (single-row key/value store, server-only) ----------
create table if not exists settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

alter table settings enable row level security;
-- No anon policies: settings are read/written only via the service-role key on the server.

-- Seed default settings rows (do nothing if they already exist).
insert into settings (key, value) values
  ('shipping', '{"insideDhaka": 60, "outsideDhaka": 120}'::jsonb),
  ('store', '{"name":"Dream Comfort","phone":"01700000000","email":"support@dreamcomfortbd.com","facebook":"https://facebook.com/dreamcomfortbd","address":"ঢাকা, বাংলাদেশ"}'::jsonb),
  ('sms_templates', '{
     "order_placed": "প্রিয় {name}, আপনার অর্ডার {order} গ্রহণ করা হয়েছে। মোট {total} টাকা (ক্যাশ অন ডেলিভারি)। ধন্যবাদ - Dream Comfort",
     "confirmed": "প্রিয় {name}, আপনার অর্ডার {order} কনফার্ম করা হয়েছে। শীঘ্রই ডেলিভারি করা হবে। - Dream Comfort",
     "shipped": "প্রিয় {name}, আপনার অর্ডার {order} কুরিয়ারে পাঠানো হয়েছে। ট্র্যাকিং: {tracking}। - Dream Comfort",
     "delivered": "প্রিয় {name}, আপনার অর্ডার {order} ডেলিভার করা হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ! - Dream Comfort"
   }'::jsonb)
on conflict (key) do nothing;

-- ---------- Optional: auto-decrement stock on order item insert ----------
-- Commented out by default. Uncomment to reduce product.stock automatically.
-- create or replace function decrement_stock() returns trigger as $$
-- begin
--   update products set stock = greatest(0, stock - new.quantity)
--   where id = new.product_id;
--   return new;
-- end; $$ language plpgsql;
-- drop trigger if exists trg_decrement_stock on order_items;
-- create trigger trg_decrement_stock after insert on order_items
--   for each row execute function decrement_stock();

-- Done.
