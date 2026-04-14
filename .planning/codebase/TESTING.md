# Testing Patterns

**Analysis Date:** 2026-04-13

## Test Framework

**Runner:**
- Playwright — E2E browser automation
- Config: `playwright.config.ts` (project root)
- Version: resolved via `@playwright/test` in `apps/web/package.json`

**Assertion Library:**
- Playwright's built-in `expect` from `@playwright/test`

**Run Commands:**
```bash
pnpm test                  # Run all E2E tests (starts dev server automatically)
PLAYWRIGHT_REUSE_SERVER=1 pnpm test  # Reuse existing dev server on :3040
```

**Note:** No unit test runner (Jest, Vitest, etc.) detected. No `*.test.ts` files exist in the workspace. The CI pipeline (`ci.yml`) runs only `lint` and `build` — E2E tests are not run in CI.

## Test File Organization

**Location:** `e2e/` directory at project root — separate from application source

**Naming:** `*.spec.ts`

**Structure:**
```
e2e/
├── health.spec.ts          # Lightweight API endpoint smoke tests
├── rigorous-flow.spec.ts   # Full user journey: login → create → edit → export → share
├── stress-quality.spec.ts  # Complex diagram rendering with theme/preset switches
└── helpers.ts              # Shared test utilities (auth helper)
```

## Test Structure

**Suite Organization:**
```typescript
test.describe("Stress and quality checks", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("handles complex technical diagram with multiple theme/preset switches", async ({
    page,
  }) => {
    // test body
  });
});
```

**Patterns:**
- `test.describe()` groups related scenarios
- `test.describe.configure({ mode: "serial" })` used for multi-step flows that share state
- `test.setTimeout()` increased for flows involving AI calls or heavy rendering (120s–180s)
- Simple API smoke tests are top-level `test()` without a describe block (`e2e/health.spec.ts`)

## Authentication in Tests

**Helper:** `demoSignIn(page, email)` from `e2e/helpers.ts`

```typescript
import { demoSignIn } from "./helpers";

await demoSignIn(page, `rigorous-${Date.now()}@example.com`);
```

**Implementation:**
```typescript
export async function demoSignIn(page: Page, email: string) {
  await page.goto("/login");
  const emailInput = page.locator('input[name="email"]');
  await emailInput.fill(email);
  const waitForApp = () => page.waitForURL(/\/app(?:\/|$)/, { timeout: 30_000 });

  const demoSignInBtn = page.locator('button:has-text("Demo sign-in")').first();
  if ((await demoSignInBtn.count()) > 0) {
    await Promise.all([waitForApp(), demoSignInBtn.click()]);
    return;
  }
  await Promise.all([waitForApp(), emailInput.press("Enter")]);
}
```

- Unique emails use `Date.now()` suffix to avoid state collisions between test runs
- Waits for app URL before returning (robust navigation check)

## Locator Patterns

**Preferred selectors:**
- ARIA roles: `page.getByRole("button", { name: "Export" })`
- Labels: `page.getByLabel("Theme")`
- Placeholders: `page.getByPlaceholder(/flowchart LR/i)` (regex for case-insensitive)
- `data-*` attributes: `page.locator("[data-export-menu-root]")`
- ID prefix patterns: `page.locator('button[id^="source-toggle-"]').first()`
- Text content: `page.locator('button:has-text("Demo sign-in")')`

**Scoping:** Locators are often scoped to parent containers before finding children:
```typescript
const exportRoot = page.locator("[data-export-menu-root]").first();
const exportBtn = exportRoot.getByRole("button", { name: "Export" });
```

## Assertions

**Visibility:**
```typescript
await expect(sourceToggle).toBeVisible();
await expect(page.getByLabel("Theme")).toBeVisible();
```

**URL matching:**
```typescript
await expect(page).toHaveURL(/\/app\/editor/);
```

**Attribute assertions:**
```typescript
await expect(exportBtn).toHaveAttribute("aria-expanded", "true");
```

**Count assertions (absence check):**
```typescript
await expect(
  page.getByRole("button", { name: /Source/i }).getByText("Error", { exact: true }),
).toHaveCount(0);
```

**API response assertions:**
```typescript
expect(res.ok()).toBeTruthy();
const j = await res.json();
expect(j.ok).toBe(true);
```

## Async Patterns

**Concurrent navigation + action:**
```typescript
await Promise.all([
  page.waitForURL(/\/app(?:\/|$)/, { timeout: 30_000 }),
  demoSignInBtn.click(),
]);
```

**Waiting for network responses:**
```typescript
const [aiResp] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/api/ai/generate")),
  page.getByRole("button", { name: "↑" }).click(),
]);
```

**File downloads:**
```typescript
const pngDownload = page.waitForEvent("download");
await page.getByRole("button", { name: "PNG" }).click();
const png = await pngDownload;
expect(png.suggestedFilename().endsWith(".png")).toBeTruthy();
```

**Handling optional/conditional UI:**
```typescript
if (!(await sourceArea.isVisible().catch(() => false))) await sourceToggle.click();
```

## Conditional Assertions for Flaky External Dependencies

When tests involve AI API calls (which may fail due to missing keys), the pattern gracefully handles both outcomes:
```typescript
if (aiResp.ok()) {
  await expect(
    page.getByRole("button", { name: /Source/i }).getByText("Error", { exact: true }),
  ).toHaveCount(0);
} else {
  await expect(
    page.locator(".border-red-200.bg-red-50")
      .filter({ hasText: /No API key|No credits left|Upstream AI|Model returned|AI request failed/i }),
  ).toBeVisible();
}
```

## Reusable Page Object Helpers

Shared panel-opening helpers are defined as module-level functions (not a class-based Page Object Model):
```typescript
async function openSourcePanel(page: Page) { ... }
async function openStylePanel(page: Page) { ... }
async function openExportMenu(page: Page) { ... }
```
These are defined at the top of each spec file that needs them, not extracted to `helpers.ts` (helpers.ts is reserved for auth).

## Playwright Config

**`playwright.config.ts`:**
- `testDir: "./e2e"` — all tests in `e2e/`
- `fullyParallel: true` — tests run in parallel (serial suites opt out via `mode: "serial"`)
- `forbidOnly: !!process.env.CI` — prevents `test.only` being committed
- `retries: 2` in CI, `0` locally
- `baseURL: "http://localhost:3040"`
- `trace: "on-first-retry"` — traces captured on flaky test retries
- Single project: `chromium` (Desktop Chrome only)
- `webServer` starts `pnpm --filter @flowchart/web dev` and waits for `/api/health`
- Test environment injects `AI_KEY_ENCRYPTION_SECRET` and `ADMIN_EMAILS` deterministically

## Permissions

Browser permissions granted explicitly where needed:
```typescript
await context.grantPermissions(["clipboard-read", "clipboard-write"], {
  origin: "http://localhost:3040",
});
```

## Coverage

**Requirements:** None enforced — no coverage tooling configured.

**Note:** No unit or integration tests exist. Coverage is entirely behavioral (E2E only).

## Test Types

**Unit Tests:** Not present — no Jest, Vitest, or equivalent runner configured.

**Integration Tests:** Not present.

**E2E Tests:**
- Framework: Playwright
- Scope: Full browser automation against a running Next.js server
- Three spec files covering: API health, rigorous user flow, stress/quality

## CI

E2E tests are **not** run in CI. The `ci.yml` pipeline runs:
1. `pnpm --filter @flowchart/core build`
2. `pnpm --filter @flowchart/web db:push`
3. `pnpm --filter @flowchart/web lint`
4. `pnpm --filter @flowchart/web build`

E2E must be run manually: `pnpm test` from the project root.

---

*Testing analysis: 2026-04-13*
