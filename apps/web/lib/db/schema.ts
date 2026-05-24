import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", {
    withTimezone: true,
    mode: "date",
  }),
  image: text("image"),
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan").notNull().default("free"),
  role: text("role").notNull().default("user"),
  creditsBalance: integer("credits_balance").notNull().default(5),
  aiApiKeyCipher: text("ai_api_key_cipher"),
  aiKeyLast4: text("ai_key_last4"),
  aiBaseUrl: text("ai_base_url"),
  aiModel: text("ai_model"),
  aiProvider: text("ai_provider").default("openai"),
}, () => [
  check("user_plan_chk", sql`plan IN ('free', 'pro')`),
  check("user_role_chk", sql`role IN ('user', 'admin')`),
]);

export const workspaces = pgTable("workspace", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
}, (t) => [index("workspace_owner_idx").on(t.ownerId)]);

export const projects = pgTable("project", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  source: text("source").notNull(),
  themeId: text("theme_id").notNull().default("stage_pipeline"),
  diagramType: text("diagram_type").notNull().default("mermaid"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
}, (t) => [index("project_workspace_idx").on(t.workspaceId)]);

export const revisions = pgTable("revision", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  createdBy: text("created_by").references(() => users.id),
}, (t) => [index("revision_project_idx").on(t.projectId)]);

export const shareLinks = pgTable("share_link", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  // PNG data URL captured client-side at share-create time, used by the OG
  // image route to render a real preview of the diagram (vs a generic card).
  previewDataUrl: text("preview_data_url"),
}, (t) => [index("share_link_project_idx").on(t.projectId)]);

export const apiKeys = pgTable("api_key", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  prefix: text("prefix").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
}, (t) => [index("api_key_user_idx").on(t.userId), index("api_key_hash_idx").on(t.keyHash)]);

export const brandKits = pgTable("brand_kit", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  paletteJson: text("palette_json"),
  logoObjectKey: text("logo_object_key"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
}, (t) => [index("brand_kit_workspace_idx").on(t.workspaceId)]);

export const exportJobs = pgTable("export_job", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status").notNull().default("queued"),
  type: text("type").notNull(),
  inputHash: text("input_hash"),
  resultUrl: text("result_url"),
  errorDetail: text("error_detail"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
}, (t) => [
  index("export_job_user_idx").on(t.userId),
  check("export_job_status_chk", sql`status IN ('queued', 'processing', 'done', 'failed')`),
]);
