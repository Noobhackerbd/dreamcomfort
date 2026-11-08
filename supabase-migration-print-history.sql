-- supabase-migration-print-history.sql — Print Station history.
-- Safe to run more than once.
--
--   print_log   one row per label printed (auto, manual, reprint) — the Print Station
--               shows today's rows, so a reload loses nothing

CREATE TABLE IF NOT EXISTS print_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  order_number text,
  customer_name text,
  kind text NOT NULL DEFAULT 'auto',   -- auto | manual | reprint
  ok boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS print_log_created_at_idx ON print_log (created_at DESC);

-- Server-only table: no public access (the admin reads it with the service role).
ALTER TABLE print_log ENABLE ROW LEVEL SECURITY;
