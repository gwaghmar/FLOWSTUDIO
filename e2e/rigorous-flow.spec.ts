import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { demoSignIn } from "./helpers";

async function openSourcePanel(page: Page) {
  const sourceToggle = page.locator('button[id^="source-toggle-"]').first();
  await expect(sourceToggle).toBeVisible();
  const sourceArea = page.getByPlaceholder(/flowchart LR/i);
  if (!(await sourceArea.isVisible().catch(() => false))) await sourceToggle.click();
  await expect(sourceArea).toBeVisible();
}

async function openStylePanel(page: Page) {
  const styleToggle = page.getByRole("button", { name: /Style/i });
  await expect(styleToggle).toBeVisible();
  await styleToggle.click();
  await expect(page.getByLabel("Theme")).toBeVisible();
}

async function openExportMenu(page: Page) {
  const exportRoot = page.locator("[data-export-menu-root]").first();
  const exportBtn = exportRoot.getByRole("button", { name: "Export" });
  await expect(exportBtn).toBeVisible();
  const expanded = await exportBtn.getAttribute("aria-expanded");
  if (expanded !== "true") {
    await exportBtn.click();
  }
  await expect(exportBtn).toHaveAttribute("aria-expanded", "true");
  await expect(exportRoot.getByRole("button", { name: "PNG" })).toBeVisible();
}

test.describe("Rigorous browser flow", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  test("login -> create -> edit -> invalid input recovery -> export -> share", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://localhost:3040",
    });
    await demoSignIn(page, `rigorous-${Date.now()}@example.com`);

    await page.goto("/app/editor?template=stage_pipeline_azure_style");
    await expect(page).toHaveURL(/\/app\/editor/);

    await expect(page.getByPlaceholder("Diagram title")).toBeVisible();

    await openSourcePanel(page);
    const sourceArea = page.getByPlaceholder(/flowchart LR/i);
    await sourceArea.fill("not_valid_mermaid_syntax {{{");
    await expect(
      page.getByRole("button", { name: /Source/i }).getByText("Error", { exact: true }),
    ).toBeVisible();

    await page.goto("/app/editor?template=decision_tree");
    await expect(page).toHaveURL(/\/app\/editor/);
    await expect(
      page.getByRole("button", { name: /Source/i }).getByText("Error", { exact: true }),
    ).toHaveCount(0);

    await openStylePanel(page);
    await page.getByLabel("Theme").selectOption("monochrome");
    await page.getByLabel("Show grid overlay").check();

    await page
      .getByPlaceholder("Ask the AI to build or change the diagram…")
      .fill(
        "Generate a complex microservices deployment flow with retries and observability",
      );
    const [aiResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/ai/generate")),
      page.getByRole("button", { name: "↑" }).click(),
    ]);
    if (aiResp.ok()) {
      await expect(
        page.getByRole("button", { name: /Source/i }).getByText("Error", { exact: true }),
      ).toHaveCount(0);
    } else {
      await expect(
        page
          .locator(".border-red-200.bg-red-50")
          .filter({ hasText: /No API key|No credits left|Upstream AI|Model returned|AI request failed/i }),
      ).toBeVisible();
    }

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();

    await openExportMenu(page);
    const pngDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "PNG" }).click();
    const png = await pngDownload;
    expect(png.suggestedFilename().endsWith(".png")).toBeTruthy();

    await openExportMenu(page);
    const svgDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "SVG" }).click();
    const svg = await svgDownload;
    expect(svg.suggestedFilename().endsWith(".svg")).toBeTruthy();

    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByText("Share link copied!")).toBeVisible();
  });

  test("settings API key + pro toggle updates gated controls", async ({ page }) => {
    await demoSignIn(page, `rigorous2-${Date.now()}@example.com`);

    await page.goto("/app/settings");
    await page.getByPlaceholder("Key name").fill("E2E Key");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/newKey=fc_/);

    await page.getByRole("button", { name: "Set Pro" }).click();
    await expect(page).toHaveURL(/\/app\/settings/);

    await page.goto("/app/editor?template=stage_pipeline_azure_style");
    await expect(page).toHaveURL(/\/app\/editor/);

    await openExportMenu(page);
    const batch = page.getByRole("button", { name: "ZIP" });
    await expect(batch).toBeEnabled();

    const zipDownload = page.waitForEvent("download");
    await batch.click();
    const zip = await zipDownload;
    expect(zip.suggestedFilename().endsWith(".zip")).toBeTruthy();
  });

  test("billing page loads and interval toggle is visible", async ({ page }) => {
    await demoSignIn(page, `billing-${Date.now()}@example.com`);
    await page.goto("/app/billing");
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Monthly" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Annual" })).toBeVisible();
  });

  test("non-admin cannot open /app/admin", async ({ page }) => {
    await demoSignIn(page, `notadmin-${Date.now()}@example.com`);
    await page.goto("/app/admin");
    await expect(page).not.toHaveURL(/\/app\/admin/);
    await expect(page).toHaveURL(/.*\/app\/?$/);
  });

  test("admin allowlist can open /app/admin", async ({ page }) => {
    await demoSignIn(page, "e2e-admin@example.com");
    await page.goto("/app/admin");
    await expect(page).toHaveURL(/\/app\/admin/);
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });

  test("settings shows AI provider (BYOK) section", async ({ page }) => {
    await demoSignIn(page, `byok-${Date.now()}@example.com`);
    await page.goto("/app/settings");
    await expect(
      page.getByRole("heading", { level: 2, name: "AI Provider (BYOK)" }),
    ).toBeVisible();
  });

  test("public marketing routes respond", async ({ page }) => {
    for (const path of ["/", "/pricing", "/docs", "/legal/privacy", "/legal/terms"]) {
      const res = await page.goto(path);
      expect(res?.ok()).toBeTruthy();
    }
  });
});
