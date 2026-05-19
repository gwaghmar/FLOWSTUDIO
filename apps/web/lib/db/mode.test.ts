import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isConnectionRefusedError, isMockDbEnabled } from "./mode.ts";

describe("isMockDbEnabled", () => {
  it("uses mock DB in development when DATABASE_URL is absent", () => {
    assert.equal(isMockDbEnabled({ NODE_ENV: "development" }), true);
  });

  it("uses real DB in development when DATABASE_URL is present", () => {
    assert.equal(
      isMockDbEnabled({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/flowchart_dev",
      }),
      false,
    );
  });

  it("allows explicit mock DB in development", () => {
    assert.equal(
      isMockDbEnabled({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/flowchart_dev",
        MOCK_DB: "true",
      }),
      true,
    );
  });

  it("does not allow mock DB in production unless explicitly allowed", () => {
    assert.equal(
      isMockDbEnabled({
        NODE_ENV: "production",
        MOCK_DB: "true",
      }),
      false,
    );
  });

  it("allows production mock DB only with the production override", () => {
    assert.equal(
      isMockDbEnabled({
        NODE_ENV: "production",
        MOCK_DB: "true",
        ALLOW_MOCK_DB_IN_PRODUCTION: "true",
      }),
      true,
    );
  });
});

describe("isConnectionRefusedError", () => {
  it("detects refused connection errors from code or message", () => {
    assert.equal(isConnectionRefusedError({ code: "ECONNREFUSED" }), true);
    assert.equal(isConnectionRefusedError(new Error("connection refused")), true);
    assert.equal(isConnectionRefusedError(new Error("permission denied")), false);
  });
});
