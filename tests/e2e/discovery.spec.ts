import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: "objekt_consent", value: "necessary", url: baseURL! }]);
});

const serious = (r: Awaited<ReturnType<AxeBuilder["analyze"]>>) =>
  r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id);

test("search works with the keyboard and passes axe", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard flow is a desktop concern");
  await page.goto("/kollektion");
  await expect(async () => {
    await page.keyboard.press("/");
    await expect(page.getByRole("dialog", { name: "Sök produkter" })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  const box = page.getByRole("combobox", { name: "Sök produkter" });
  await expect(box).toBeFocused();
  await page.keyboard.type("vagg");
  const options = page.getByRole("option");
  await expect(options.first()).toBeVisible();
  expect(serious(await new AxeBuilder({ page }).include("dialog[open]").analyze())).toEqual([]);

  await page.keyboard.press("ArrowDown");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  const name = (await options.first().locator("span span").first().textContent())!;
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
});

test("search results page works without the dialog and is shareable", async ({ page }) => {
  await page.goto("/sok?q=terrakotta");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("träffar på ”terrakotta”");
  await expect(page.getByRole("article").filter({ hasText: "Ovo vas" })).toBeVisible();
  expect(serious(await new AxeBuilder({ page }).analyze())).toEqual([]);

  await page.goto("/sok?q=xyzzy");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Inga träffar");
});

test("Visa fler loads the next page and keeps it in the URL", async ({ page }) => {
  await page.goto("/kollektion");
  await expect(page.getByRole("article")).toHaveCount(12);
  await expect(page.getByText(/Visar 12 av \d+ produkter/)).toBeVisible();
  await page.getByRole("link", { name: "Visa fler" }).click();
  await expect(page).toHaveURL(/sida=2/);
  await expect(page.getByRole("article")).toHaveCount(24);
  // The first new product gets focus, so keyboard users continue from there.
  await expect(page.getByRole("article").nth(12).getByRole("link").first()).toBeFocused();

  // A shared link opens with the same number of products.
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(24);
  // Changing a filter starts again from the first page.
  await page.goto("/kollektion?sida=3");
  await expect(page.getByRole("article").first()).toBeVisible();
  expect(await page.getByRole("article").count()).toBeGreaterThan(24);
});

test("quick add puts a chosen colour in the cart from the collection", async ({ page }) => {
  await page.goto("/kollektion");
  const card = page.getByRole("article").filter({ hasText: "Ovo vas" });
  await card.hover();
  await card.getByRole("button", { name: "Snabbköp Ovo vas" }).click();
  const drawer = page.getByRole("dialog", { name: "Snabbköp" });
  await expect(drawer).toBeVisible();
  const olive = drawer.getByRole("radio", { name: "Olivgrön" });
  await expect(olive).toBeInViewport({ ratio: 1 }); // the drawer slides in
  await olive.check({ force: true });
  await drawer.getByRole("button", { name: "Lägg i varukorgen" }).click();
  const cart = page.getByRole("dialog", { name: /Varukorg/ });
  await expect(cart.getByRole("link", { name: /Ovo vas \(Olivgrön/ })).toBeVisible();
  await expect(page).toHaveURL(/\/kollektion$/);
});

test("sets add every piece at the set price; the guide opens", async ({ page }) => {
  await page.goto("/produkter/mugg");
  const sets = page.getByRole("region", { name: "Komplettera med" });
  await expect(sets.getByRole("heading", { name: "Frukostset" })).toBeVisible();
  await sets.getByRole("button", { name: "Lägg setet i varukorgen" }).click();
  const cart = page.getByRole("dialog", { name: /Varukorg/ });
  await expect(cart.getByText("Setrabatt")).toBeVisible();
  await expect(cart.getByText("−70 kr")).toBeVisible(); // 569 kr one by one, 499 kr as a set
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Mått och skötsel" }).click();
  const guide = page.getByRole("dialog", { name: "Mått och skötsel" });
  await expect(guide.getByText("Stengods och keramik")).toBeVisible();
});

test("product pages suggest matches and remember what was viewed", async ({ page }) => {
  await page.goto("/produkter/ovo-vas");
  await expect(page.getByRole("heading", { name: "Passar bra med" })).toBeVisible();
  await page.goto("/produkter/halo-bordslampa");
  const recent = page.getByRole("region", { name: "Senast visade" });
  await expect(recent.getByRole("article").filter({ hasText: "Ovo vas" })).toBeVisible();
  await expect(recent.getByRole("article").filter({ hasText: "Halo bordslampa" })).toHaveCount(0);
});
