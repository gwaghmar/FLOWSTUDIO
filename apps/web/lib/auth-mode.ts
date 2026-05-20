import type { AuthSession } from "@/auth";

type Env = Partial<Record<string, string | undefined>>;

function envFlag(value: string | undefined): boolean | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

export function hasSupabaseConfig(env: Env = process.env): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function isMockAuthEnabled(env: Env = process.env): boolean {
  const explicit = envFlag(env.MOCK_AUTH);
  const isProduction = env.NODE_ENV === "production";
  const allowProductionMock = envFlag(env.ALLOW_MOCK_AUTH_IN_PRODUCTION) === true;

  if (isProduction && explicit === true && !allowProductionMock) {
    return false;
  }
  if (explicit !== null) return explicit;

  return !isProduction;
}

export function getMockSession(): AuthSession {
  return {
    user: {
      id: "dev-user-id",
      email: "dev@example.com",
      name: "Developer",
      image: null,
    },
  };
}
