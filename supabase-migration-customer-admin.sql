-- Registered-customer admin metadata: private notes + tags shown on the
-- Admin → Registered Customers page. Safe to run more than once.
-- Run in Supabase → SQL Editor.

ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS admin_tags  text[];

-- (Notes/tags are optional — the page works without this migration, but the
--  "Save" button on a customer's notes needs these two columns to persist.)
