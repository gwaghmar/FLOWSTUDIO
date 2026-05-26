-- 0002_ai_events.sql
-- Telemetry for every AI generation request: timing, tokens, validation outcome.
CREATE TABLE IF NOT EXISTS "ai_event" (
  "id" text PRIMARY KEY,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "diagram_type" text NOT NULL,
  "effective_diagram_type" text NOT NULL,
  "type_switched" boolean NOT NULL DEFAULT false,
  "mode" text NOT NULL,
  "provider" text NOT NULL,
  "model" text NOT NULL,
  "prompt_length" integer NOT NULL DEFAULT 0,
  "source_length" integer NOT NULL DEFAULT 0,
  "intent_latency_ms" integer,
  "gen_latency_ms" integer,
  "total_latency_ms" integer NOT NULL,
  "input_tokens" integer,
  "output_tokens" integer,
  "validation_status" text NOT NULL,
  "retry_attempted" boolean NOT NULL DEFAULT false,
  "intent_fallback" boolean NOT NULL DEFAULT false,
  "error" text,
  CONSTRAINT "ai_event_mode_chk" CHECK (mode IN ('patch', 'create')),
  CONSTRAINT "ai_event_validation_chk" CHECK (validation_status IN ('ok', 'repaired', 'failed_after_retry', 'error'))
);

CREATE INDEX IF NOT EXISTS "ai_event_user_idx" ON "ai_event" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_event_created_idx" ON "ai_event" ("created_at");
