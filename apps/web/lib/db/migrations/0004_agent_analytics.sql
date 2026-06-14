-- Agent Mode analytics: tool-call count + allow mode='agent'.
ALTER TABLE "ai_event" ADD COLUMN IF NOT EXISTS "tool_calls" integer;

ALTER TABLE "ai_event" DROP CONSTRAINT IF EXISTS "ai_event_mode_chk";
ALTER TABLE "ai_event" ADD CONSTRAINT "ai_event_mode_chk" CHECK (mode IN ('patch', 'create', 'agent'));
