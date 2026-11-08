import { expect, test, type Page } from "@playwright/test";

/**
 * Screenshot comparisons of the views that matter most. Anything that
 * changes on its own (delivery dates, the clock) is masked, and the clock is
 * frozen so the "order within" countdown can't differ between runs.
 */
test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: "objekt_consent", value: "necessary", url: baseURL! }]);
  await page.clock.setFixedTime(new Date("2026-11-10T09:00:00+01:00"));
});

const dynamic = (page: Page) => [page.locator('[class*="DeliveryEstimate_box"]'), page.locator('[class*="DeliveryPicker_methodSub"]')];

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
}

test("home", async ({ page }) => {
  await page.goto("/");
  await settle(page);
  await expect(page).toHaveScreenshot("home.png", { fullPage: true, mask: dynamic(page) });
});

test("collection", async ({ page }) => {
  await page.goto("/kollektion");
  await settle(page);
  await expect(page).toHaveScreenshot("collection.png", { fullPage: true });
});

test("product", async ({ page }) => {
  await page.goto("/produkter/halo-bordslampa");
  await settle(page);
  await expect(page).toHaveScreenshot("product.png", { mask: dynamic(page) });
});

test("cart", async ({ page }) => {
  await page.goto("/produkter/ovo-vas");
  await settle(page);
  await page.getByRole("button", { name: /Lägg i varukorgen/ }).first().click();
  const cart = page.getByRole("dialog", { name: /Varukorg/ });
  await expect(cart).toBeVisible();
  await expect(cart.getByRole("radiogroup", { name: "Ombud" })).toBeVisible();
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot("cart.png", { mask: dynamic(page) });
});
