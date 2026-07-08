CREATE TABLE "ai_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diagram_type" text NOT NULL,
	"effective_diagram_type" text NOT NULL,
	"type_switched" boolean DEFAULT false NOT NULL,
	"mode" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_length" integer DEFAULT 0 NOT NULL,
	"source_length" integer DEFAULT 0 NOT NULL,
	"intent_latency_ms" integer,
	"gen_latency_ms" integer,
	"total_latency_ms" integer NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"tool_calls" integer,
	"validation_status" text NOT NULL,
	"retry_attempted" boolean DEFAULT false NOT NULL,
	"intent_fallback" boolean DEFAULT false NOT NULL,
	"error" text,
	CONSTRAINT "ai_event_mode_chk" CHECK (mode IN ('patch', 'create', 'agent')),
	CONSTRAINT "ai_event_validation_chk" CHECK (validation_status IN ('ok', 'repaired', 'failed_after_retry', 'error'))
);
--> statement-breakpoint
ALTER TABLE "ai_event" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "passkey_challenge" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"challenge" text NOT NULL,
	"type" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passkey_challenge_type_chk" CHECK (type IN ('registration', 'authentication'))
);
--> statement-breakpoint
ALTER TABLE "passkey_challenge" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "passkey_credential" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"credential_public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"transports" text,
	"aaguid" text,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passkey_credential_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
ALTER TABLE "passkey_credential" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_key" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brand_kit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "export_job" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "revision" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "share_link" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "export_job" DROP CONSTRAINT "export_job_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "share_link" ADD COLUMN "preview_data_url" text;--> statement-breakpoint
ALTER TABLE "share_link" ADD COLUMN "raw_token" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "ai_event" ADD CONSTRAINT "ai_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey_challenge" ADD CONSTRAINT "passkey_challenge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey_credential" ADD CONSTRAINT "passkey_credential_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_event_user_idx" ON "ai_event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_event_created_idx" ON "ai_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "passkey_challenge_user_idx" ON "passkey_challenge" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credential_user_idx" ON "passkey_credential" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credential_id_idx" ON "passkey_credential" USING btree ("credential_id");--> statement-breakpoint
ALTER TABLE "export_job" ADD CONSTRAINT "export_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_user_idx" ON "api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_key_hash_idx" ON "api_key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "brand_kit_workspace_idx" ON "brand_kit" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "export_job_user_idx" ON "export_job" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_workspace_idx" ON "project" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "revision_project_idx" ON "revision" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "share_link_project_idx" ON "share_link" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "workspace_owner_idx" ON "workspace" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_handle_unique" UNIQUE("handle");--> statement-breakpoint
ALTER TABLE "export_job" ADD CONSTRAINT "export_job_status_chk" CHECK (status IN ('queued', 'processing', 'done', 'failed'));--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_plan_chk" CHECK (plan IN ('free', 'pro'));--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_chk" CHECK (role IN ('user', 'admin'));