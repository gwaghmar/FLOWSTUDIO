export function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
}

export function isAdminEmail(email: string): boolean {
  return parseAdminEmails().has(email.toLowerCase());
}

export function resolveRoleForNewUser(email: string): "admin" | "user" {
  return isAdminEmail(email) ? "admin" : "user";
}
