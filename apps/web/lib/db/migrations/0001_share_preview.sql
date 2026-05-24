-- 0001_share_preview.sql
-- Add preview_data_url for storing client-captured share previews.
ALTER TABLE "share_link" ADD COLUMN IF NOT EXISTS "preview_data_url" text;
