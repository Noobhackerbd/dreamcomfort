-- Per-worker login PIN. Each worker logs into /worker with their own PIN and
-- lands on their own live panel. Safe to run more than once.
-- Run in Supabase → SQL Editor.

ALTER TABLE workers ADD COLUMN IF NOT EXISTS pin text;
CREATE INDEX IF NOT EXISTS workers_pin_idx ON workers (pin);
