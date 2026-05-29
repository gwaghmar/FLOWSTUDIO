const adminEmailSet: Set<string> = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

export function parseAdminEmails(): Set<string> {
  return adminEmailSet;
}

export function isAdminEmail(email: string): boolean {
  return adminEmailSet.has(email.toLowerCase());
}

export function resolveRoleForNewUser(email: string): "admin" | "user" {
  return isAdminEmail(email) ? "admin" : "user";
}
