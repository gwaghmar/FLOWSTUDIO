type Env = Partial<Record<string, string | undefined>>;

export type DeploymentReadinessStatus = "ready" | "missing" | "blocked";

export type DeploymentReadinessItem = {
  id: string;
  label: string;
  status: DeploymentReadinessStatus;
  detail: string;
};

export type DeploymentReadinessReport = {
  ready: boolean;
  items: DeploymentReadinessItem[];
};

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function flagEnabled(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

function required(
  id: string,
  label: string,
  value: string | undefined,
  detail: string,
): DeploymentReadinessItem {
  return hasValue(value)
    ? { id, label, status: "ready", detail: "Configured" }
    : { id, label, status: "missing", detail };
}

function blockedMockFlag(
  id: string,
  label: string,
  value: string | undefined,
): DeploymentReadinessItem {
  return flagEnabled(value)
    ? {
        id,
        label,
        status: "blocked",
        detail: "Disable this before production deploys.",
      }
    : { id, label, status: "ready", detail: "Disabled" };
}

export function getDeploymentReadiness(
  env: Env = process.env,
): DeploymentReadinessReport {
  const items: DeploymentReadinessItem[] = [
    required("database-url", "Postgres DATABASE_URL", env.DATABASE_URL, "Required for projects, users, revisions, and API keys."),
    required("supabase-url", "Supabase URL", env.NEXT_PUBLIC_SUPABASE_URL, "Required for Supabase auth."),
    required("supabase-anon-key", "Supabase anon key", env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Required for Supabase browser/server clients."),
    required("auth-secret", "Auth secret", env.AUTH_SECRET, "Required for production auth/session safety."),
    hasValue(env.AI_KEY_ENCRYPTION_SECRET) && env.AI_KEY_ENCRYPTION_SECRET!.length >= 16
      ? {
          id: "ai-key-encryption-secret",
          label: "AI key encryption secret",
          status: "ready",
          detail: "Configured",
        }
      : {
          id: "ai-key-encryption-secret",
          label: "AI key encryption secret",
          status: "missing",
          detail: "Required for saved BYOK provider keys; minimum 16 characters.",
        },
    blockedMockFlag("mock-auth", "MOCK_AUTH", env.MOCK_AUTH),
    blockedMockFlag("mock-db", "MOCK_DB", env.MOCK_DB),
  ];

  return {
    ready: items.every((item) => item.status === "ready"),
    items,
  };
}
