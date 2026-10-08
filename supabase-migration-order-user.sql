-- SECURITY FIX: link orders to the customer ACCOUNT that placed them.
--
-- Before: "My Orders" matched orders by the phone number typed on the profile page —
-- which anyone could change to someone else's number and see that person's orders
-- (name, address, phone, items). Now an account only sees:
--   1) orders placed while logged into that account (this column), and
--   2) orders whose phone matches a number the customer VERIFIED by SMS code (OTP).
--
-- Safe to run more than once. Checkout keeps working even before this is run.

alter table orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_id_idx on orders (user_id);
