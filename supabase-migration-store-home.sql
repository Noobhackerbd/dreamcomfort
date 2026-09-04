-- Store homepage: per-product rating + review count (shown on product cards).
-- Home banner images are stored in the settings table (key "home_banners"), so no
-- table is needed for those.

alter table products add column if not exists rating numeric(2,1);
alter table products add column if not exists review_count int default 0;
