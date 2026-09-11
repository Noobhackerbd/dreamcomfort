-- Rich, editorial content for the premium product page. All optional — the page falls
-- back gracefully when a field is empty.

alter table products add column if not exists highlights jsonb;   -- ["আরামদায়ক", "প্রিমিয়াম ফ্যাব্রিক", ...]
alter table products add column if not exists specs jsonb;        -- [{"label":"উপাদান","value":"কটন"}, ...]
alter table products add column if not exists how_to_use text;    -- free text (steps)
alter table products add column if not exists faq jsonb;          -- [{"q":"...","a":"..."}, ...]
alter table products add column if not exists video_url text;     -- YouTube / mp4 URL (optional)
