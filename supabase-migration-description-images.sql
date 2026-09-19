-- Extra photos shown inside the product description (Daraz-style long detail images).
-- Edited from the admin product form (multi-image upload).
alter table products add column if not exists description_images jsonb;
