CREATE TABLE "collaborator_presence" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"cursor_x" integer,
	"cursor_y" integer,
	"selection_start" text,
	"selection_end" text,
	"color" text NOT NULL,
	"last_heartbeat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collaborator_presence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_collaborator" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_collaborator_role_chk" CHECK (role IN ('viewer', 'editor', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "project_collaborator" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_edit" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"operation" text NOT NULL,
	"operation_data" text NOT NULL,
	"client_id" text NOT NULL,
	"lamport_timestamp" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_edit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collaborator_presence" ADD CONSTRAINT "collaborator_presence_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborator_presence" ADD CONSTRAINT "collaborator_presence_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_collaborator" ADD CONSTRAINT "project_collaborator_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_collaborator" ADD CONSTRAINT "project_collaborator_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_edit" ADD CONSTRAINT "project_edit_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_edit" ADD CONSTRAINT "project_edit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collaborator_presence_project_idx" ON "collaborator_presence" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "collaborator_presence_heartbeat_idx" ON "collaborator_presence" USING btree ("last_heartbeat");--> statement-breakpoint
CREATE INDEX "project_collaborator_project_idx" ON "project_collaborator" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_collaborator_user_idx" ON "project_collaborator" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_edit_project_idx" ON "project_edit" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_edit_created_idx" ON "project_edit" USING btree ("created_at");