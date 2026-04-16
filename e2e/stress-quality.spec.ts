import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { demoSignIn } from "./helpers";

const COMPLEX_FLOW = `flowchart LR
  subgraph edge["Edge Layer"]
    U[Users] --> CDN[CDN]
    CDN --> WAF[WAF]
    WAF --> GW[API Gateway]
  end
  subgraph svc["Services"]
    GW --> AUTH[Auth]
    GW --> PROFILE[Profile]
    GW --> ORDER[Order]
    GW --> BILL[Billing]
    GW --> SEARCH[Search]
  end
  subgraph data["Data"]
    PG[(Postgres)]
    REDIS[(Redis)]
    ES[(Elasticsearch)]
    MQ[(Queue)]
  end
  AUTH --> REDIS
  PROFILE --> PG
  ORDER --> PG
  BILL --> PG
  SEARCH --> ES
  ORDER --> MQ
  MQ --> BILL
  MQ --> SEARCH
  GW -.rate limit.-> ALERT[Alert]
  ORDER -.timeout.-> RETRY[Retry policy]
  RETRY --> ORDER`;

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

test.describe("Stress and quality checks", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("handles complex technical diagram with multiple theme/preset switches", async ({
    page,
  }) => {
    await demoSignIn(page, `stress1-${Date.now()}@example.com`);

    await page.goto("/app/editor");
    await expect(page).toHaveURL(/\/app\/editor/);

    await openSourcePanel(page);
    const source = page.getByPlaceholder(/flowchart LR/i);
    await source.fill(COMPLEX_FLOW);
    await expect(
      page.getByRole("button", { name: /Source/i }).getByText("Error", { exact: true }),
    ).toHaveCount(0);

    await openStylePanel(page);
    await page.getByLabel("Theme").selectOption("stage_pipeline");
    await page.getByLabel("Theme").selectOption("neon_tech");
    await page.getByLabel("Theme").selectOption("monochrome");
    await page.getByLabel("Show grid overlay").check();

    await openExportMenu(page);
    const pngD = page.waitForEvent("download");
    await page.getByRole("button", { name: "PNG" }).click();
    expect((await pngD).suggestedFilename()).toContain(".png");

    await openExportMenu(page);
    const svgD = page.waitForEvent("download");
    await page.getByRole("button", { name: "SVG" }).click();
    expect((await svgD).suggestedFilename()).toContain(".svg");
  });

  test("recovers from dumb/broken code quickly and keeps UI responsive", async ({ page }) => {
    await demoSignIn(page, `stress2-${Date.now()}@example.com`);

    await page.goto("/app/editor");
    await expect(page).toHaveURL(/\/app\/editor/);

    await openSourcePanel(page);
    const source = page.getByPlaceholder(/flowchart LR/i);
    await source.fill("not_valid_mermaid_syntax {{{");
    await expect(
      page.getByRole("button", { name: /Source/i }).getByText("Error", { exact: true }),
    ).toBeVisible();

    await page.goto("/app/editor?template=distributed_microservices");
    await expect(
      page.getByRole("button", { name: /Source/i }).getByText("Error", { exact: true }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  });
});
