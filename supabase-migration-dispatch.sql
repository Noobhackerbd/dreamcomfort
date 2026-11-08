-- supabase-migration-dispatch.sql — parcel handover scanning (Admin → Dispatch).
-- Safe to run more than once.
--
--   handed_at             when the parcel's label was scanned while handing it to the courier
--                         (the order becomes "shipped" at the same moment)
--   no_entry_alerted_at   when we notified that the courier still shows "pickup requested"
--                         for a parcel we already handed over (sent once per parcel)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS handed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS no_entry_alerted_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_handed_at_idx ON orders (handed_at) WHERE handed_at IS NOT NULL;
