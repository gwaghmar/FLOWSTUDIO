type Env = Partial<Record<string, string | undefined>>;

function envFlag(value: string | undefined): boolean | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

export function isMockDbEnabled(env: Env = process.env): boolean {
  const explicit = envFlag(env.MOCK_DB);
  const isProduction = env.NODE_ENV === "production";
  const allowProductionMock = envFlag(env.ALLOW_MOCK_DB_IN_PRODUCTION) === true;

  if (isProduction && explicit === true && !allowProductionMock) {
    return false;
  }
  if (explicit !== null) return explicit;

  return !isProduction && !env.DATABASE_URL?.trim();
}

export function isConnectionRefusedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: unknown; message?: unknown };
  return (
    maybe.code === "ECONNREFUSED" ||
    (typeof maybe.message === "string" &&
      maybe.message.toLowerCase().includes("connection refused"))
  );
}
