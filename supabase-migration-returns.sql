-- supabase-migration-returns.sql — returned-parcel receiving (Admin → Returns).
-- Safe to run more than once.
--
--   returned_at         when the courier-status cron first saw the parcel as returned
--                       (only returns from the day this runs onward are listed)
--   return_received_at  when the returned parcel's label QR was scanned at the shop
--   courier_flag        'late_return'    – we had it as delivered, courier later said Return
--                       'late_delivered' – we had it as returned, courier later said Delivered
--   courier_flag_at     when that flag was set

ALTER TABLE orders ADD COLUMN IF NOT EXISTS returned_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_received_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_flag text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_flag_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_returned_at_idx ON orders (returned_at) WHERE returned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_courier_flag_idx ON orders (courier_flag_at) WHERE courier_flag IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_order_number_idx ON orders (order_number);
