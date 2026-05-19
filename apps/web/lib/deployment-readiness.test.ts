import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDeploymentReadiness } from "./deployment-readiness.ts";

describe("getDeploymentReadiness", () => {
  it("marks production core config ready when required values are present", () => {
    const report = getDeploymentReadiness({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://example",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      AUTH_SECRET: "secret",
      AI_KEY_ENCRYPTION_SECRET: "1234567890123456",
      MOCK_AUTH: "false",
      MOCK_DB: "false",
    });

    assert.equal(report.ready, true);
    assert.equal(report.items.every((item) => item.status === "ready"), true);
  });

  it("flags missing production database and Supabase config", () => {
    const report = getDeploymentReadiness({
      NODE_ENV: "production",
    });

    assert.equal(report.ready, false);
    assert.deepEqual(
      report.items
        .filter((item) => item.status === "missing")
        .map((item) => item.id),
      [
        "database-url",
        "supabase-url",
        "supabase-anon-key",
        "auth-secret",
        "ai-key-encryption-secret",
      ],
    );
  });

  it("blocks production mock auth and mock DB", () => {
    const report = getDeploymentReadiness({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://example",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      AUTH_SECRET: "secret",
      AI_KEY_ENCRYPTION_SECRET: "1234567890123456",
      MOCK_AUTH: "true",
      MOCK_DB: "true",
    });

    assert.equal(report.ready, false);
    assert.deepEqual(
      report.items
        .filter((item) => item.status === "blocked")
        .map((item) => item.id),
      ["mock-auth", "mock-db"],
    );
  });
});
