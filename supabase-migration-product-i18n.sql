-- Product page bilingual content: English versions of the premium fields.
-- The Bengali/primary values stay in the existing columns (highlights, specs,
-- faq, how_to_use); these hold the AI-generated English so the product page can
-- switch cleanly with the storefront language toggle.
--
-- Safe to run more than once (IF NOT EXISTS). Product save/backfill degrade
-- gracefully until this runs, so nothing breaks if you deploy first and run later.

alter table products add column if not exists highlights_en  jsonb;
alter table products add column if not exists specs_en       jsonb;
alter table products add column if not exists faq_en         jsonb;
alter table products add column if not exists how_to_use_en  text;
