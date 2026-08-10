-- =====================================================================
-- Dream Comfort BD — Migration 3
-- Run AFTER supabase-schema.sql and supabase-migration-2.sql.
-- Adds: product variants (priced color/model options) + landing-page config.
-- Safe to re-run.
-- =====================================================================

-- Priced variants on a product, e.g.
--   [{"id":"sky","label":"Sky Blue","price":850,"compare_at_price":1200,"image":"https://..."}]
alter table products
  add column if not exists variants jsonb not null default '[]'::jsonb;

-- Record the chosen variant label on an order line (optional; product_name also carries it).
alter table order_items
  add column if not exists variant_label text;

-- ---------- Landing page config (single-product funnel homepage) ----------
insert into settings (key, value) values
  ('landing', '{
    "productSlug": "",
    "logoUrl": "",
    "headline": "মায়েদের জন্য আরামের প্রেগন্যান্সি পিলো",
    "subheadline": "সারা রাত আরামে ঘুমান — পিঠ ও কোমরের ব্যথা কমান।",
    "heroImages": [],
    "badges": ["ক্যাশ অন ডেলিভারি", "সারা দেশে ফ্রি ডেলিভারি", "৩ দিনের মানিব্যাক গ্যারান্টি"],
    "benefits": [
      {"icon": "🛌", "title": "আরামদায়ক ঘুম", "text": "সঠিক পজিশনে ঘুমানোর সাপোর্ট"},
      {"icon": "💪", "title": "ব্যথা কমায়", "text": "পিঠ ও কোমরের চাপ কমায়"},
      {"icon": "🤰", "title": "গর্ভবতী মায়েদের জন্য", "text": "প্রেগন্যান্সিতে বিশেষভাবে উপযোগী"},
      {"icon": "✅", "title": "প্রিমিয়াম মান", "text": "নরম, টেকসই ও নিরাপদ ম্যাটেরিয়াল"}
    ],
    "guaranteeTitle": "৩ দিনের মানিব্যাক গ্যারান্টি",
    "guaranteeText": "পণ্য পছন্দ না হলে ৩ দিনের মধ্যে ফেরত দিন — সম্পূর্ণ টাকা ফেরত।",
    "reviews": [
      {"name": "Sadia R.", "text": "খুব আরামদায়ক, রাতে ভালো ঘুম হচ্ছে।", "stars": 5, "image": ""},
      {"name": "Nusrat J.", "text": "কোমরের ব্যথা অনেক কমেছে। ধন্যবাদ!", "stars": 5, "image": ""},
      {"name": "Tania A.", "text": "দ্রুত ডেলিভারি পেয়েছি, মান দারুণ।", "stars": 4, "image": ""}
    ],
    "ctaText": "অর্ডার কনফার্ম করুন",
    "urgencyText": "🔥 সীমিত স্টক — আজই অর্ডার করুন!",
    "statText": "৫০০০+ সন্তুষ্ট মা"
  }'::jsonb)
on conflict (key) do nothing;

-- Done.
