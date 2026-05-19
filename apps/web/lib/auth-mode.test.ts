import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getMockSession, isMockAuthEnabled } from "./auth-mode.ts";

describe("isMockAuthEnabled", () => {
  it("uses mock auth in development when Supabase env vars are absent", () => {
    assert.equal(isMockAuthEnabled({ NODE_ENV: "development" }), true);
  });

  it("keeps mock auth as the development default even when Supabase env vars exist", () => {
    assert.equal(
      isMockAuthEnabled({
        NODE_ENV: "development",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      }),
      true,
    );
  });

  it("uses real auth when MOCK_AUTH is explicitly false", () => {
    assert.equal(
      isMockAuthEnabled({
        NODE_ENV: "development",
        MOCK_AUTH: "false",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      }),
      false,
    );
  });

  it("does not allow mock auth in production unless explicitly allowed", () => {
    assert.equal(
      isMockAuthEnabled({
        NODE_ENV: "production",
        MOCK_AUTH: "true",
      }),
      false,
    );
  });
});

describe("getMockSession", () => {
  it("returns a stable developer identity", () => {
    assert.deepEqual(getMockSession()?.user, {
      id: "dev-user-id",
      email: "dev@example.com",
      name: "Developer",
      image: null,
    });
  });
});
