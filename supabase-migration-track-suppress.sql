-- Marks an order whose Meta/TikTok Purchase event was intentionally NOT sent
-- (customer's courier success rate was below the configured threshold). The
-- thank-you page reads this to skip the browser Pixel too.

alter table orders add column if not exists track_suppressed boolean not null default false;
