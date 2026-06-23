-- Enable Row-Level Security on every application table as a defense-in-depth
-- backstop for tenant isolation.
--
-- Why this is safe AND necessary here:
--   * The Next.js app talks to Postgres through DATABASE_URL as the privileged
--     `postgres` role (the table owner). That role BYPASSES RLS, so every
--     server action / route handler keeps working unchanged.
--   * Supabase exposes the `public` schema over PostgREST using the anon key,
--     and that anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) is shipped to the
--     browser. With RLS OFF, anyone holding that public key could read or write
--     these tables directly via the REST API. Enabling RLS with NO permissive
--     policies denies that path by default (deny-by-default).
--   * The browser only ever uses Supabase for auth + realtime presence channels,
--     never for table reads, so no legitimate client path is affected.
--
-- Authorization is still enforced in the app layer (server actions check
-- workspace ownership). This is a backstop, not a replacement for those checks.
-- NOTE: ENABLE (not FORCE) is deliberate — FORCE would subject the table owner
-- to RLS and break the app's own queries.

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workspace" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "project" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "revision" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "share_link" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "brand_kit" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "api_key" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "export_job" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ai_event" ENABLE ROW LEVEL SECURITY;
