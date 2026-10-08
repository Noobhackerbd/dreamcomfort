-- Per-product delivery charge (optional).
--
-- Leave a column NULL and that product uses the global Settings → Shipping value.
-- When several products with different charges are bought together, checkout charges
-- the HIGHEST of them once (never the sum). A landing page that sets its own delivery
-- charge still wins over these — see claude/dreamcomfort-landing-pages.md.
--
-- Safe to run more than once. The storefront keeps working before this is run.

alter table products add column if not exists shipping_inside  numeric(12,2);
alter table products add column if not exists shipping_outside numeric(12,2);
