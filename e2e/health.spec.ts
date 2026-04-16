import { test, expect } from "@playwright/test";

test("health endpoint", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const j = await res.json();
  expect(j.ok).toBe(true);
});

test("openapi json", async ({ request }) => {
  const res = await request.get("/api/openapi");
  expect(res.ok()).toBeTruthy();
  const j = await res.json();
  expect(j.openapi).toBe("3.1.0");
});
