-- Performance indexes for the admin dashboard + order list.
-- Safe to run any time (IF NOT EXISTS). Run once in Supabase → SQL Editor.
-- These are the single biggest speed-up: without them, the dashboard scans whole
-- tables for every range query and visitor count.

-- page_visits: the dashboard scans visits in a date window (heaviest query).
create index if not exists page_visits_created_at_idx on page_visits (created_at desc);
create index if not exists page_visits_visitor_idx on page_visits (visitor_id);

-- orders: range windows, status filters, soft-delete, booked reminders.
create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_deleted_at_idx on orders (deleted_at);
create index if not exists orders_booked_idx on orders (booked_date) where is_booked = true;

-- order_items: joins + top-products tally.
create index if not exists order_items_order_id_idx on order_items (order_id);
create index if not exists order_items_product_name_idx on order_items (product_name);

-- products: low-stock lookup.
create index if not exists products_stock_idx on products (stock);

-- Fast order search (order no / phone / name) using trigram indexes for ILIKE '%..%'.
-- Needs the pg_trgm extension (available on Supabase).
create extension if not exists pg_trgm;
create index if not exists orders_order_number_trgm on orders using gin (order_number gin_trgm_ops);
create index if not exists orders_customer_phone_trgm on orders using gin (customer_phone gin_trgm_ops);
create index if not exists orders_customer_name_trgm on orders using gin (customer_name gin_trgm_ops);
