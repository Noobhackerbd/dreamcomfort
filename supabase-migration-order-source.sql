-- Traffic source per order (tiktok / facebook / google / direct / …), captured from the
-- landing URL's click ids (ttclid, fbclid) or utm_source and stored on the order.

alter table orders add column if not exists source text;

create index if not exists idx_orders_source on orders(source);
