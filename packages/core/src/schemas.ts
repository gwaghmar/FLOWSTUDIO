import { z } from "zod";

export const ErrorCode = z.enum([
  "VALIDATION_ERROR",
  "MERMAID_PARSE_ERROR",
  "NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "RATE_LIMITED",
  "ENTITLEMENT_REQUIRED",
  "INSUFFICIENT_CREDITS",
  "EXPORT_TIMEOUT",
  "INTERNAL_ERROR",
]);

export type ErrorCodeType = z.infer<typeof ErrorCode>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: ErrorCode,
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Diagram text source — validated length; parse/render happens client/server */
export const MermaidSourceSchema = z
  .string()
  .min(1, "Diagram source is required")
  .max(500_000, "Diagram exceeds maximum length");

export const ThemeIdSchema = z.string().min(1).max(64);

export const SocialPresetIdSchema = z.enum([
  "square_feed",
  "vertical_feed",
  "story_reel",
  "landscape",
  "link_preview",
  "custom",
]);

export type SocialPresetId = z.infer<typeof SocialPresetIdSchema>;

export const ExportOptionsSchema = z.object({
  preset: SocialPresetIdSchema.optional(),
  width: z.number().int().positive().max(8192).optional(),
  height: z.number().int().positive().max(8192).optional(),
  scale: z.number().min(0.5).max(4).default(2),
  background: z.enum(["transparent", "theme", "white", "black"]).default("theme"),
  showGrid: z.boolean().optional(),
});

export type ExportOptions = z.infer<typeof ExportOptionsSchema>;

export const DiagramStateSchema = z.object({
  source: MermaidSourceSchema,
  themeId: ThemeIdSchema,
  brandKitId: z.string().uuid().optional().nullable(),
});
