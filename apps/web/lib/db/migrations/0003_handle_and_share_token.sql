-- Add handle to users for public profile URLs
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "handle" text;
CREATE UNIQUE INDEX IF NOT EXISTS "user_handle_idx" ON "user" ("handle");

-- Add raw_token to share_link so profile pages can construct /s/<token> URLs.
-- The hash stays for lookups; this column is for display-only linking.
ALTER TABLE "share_link" ADD COLUMN IF NOT EXISTS "raw_token" text;
