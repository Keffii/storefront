import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: "objekt_consent", value: "necessary", url: baseURL! }]);
});

test("colour dots on a product card preview the colour and link to it", async ({ page, isMobile }) => {
  await page.goto("/kollektion");
  const card = page.getByRole("article").filter({ hasText: "Halo bordslampa" });
  const image = card.getByRole("img").first();
  await expect(image).toHaveAttribute("src", /grafit/);

  if (!isMobile) {
    await card.getByRole("button", { name: /i Dimblå/ }).hover();
    await expect(image).toHaveAttribute("src", /dimbla/);
    await page.mouse.move(0, 0);
  }

  await card.getByRole("button", { name: /i Krita/ }).click();
  await expect(card.getByRole("button", { name: /i Krita/ })).toHaveAttribute("aria-pressed", "true");
  await expect(image).toHaveAttribute("src", /krita/);
  await card.getByRole("link").first().click();
  await expect(page).toHaveURL(/halo-bordslampa\?variant=krita-s/);
  await expect(page.getByRole("radio", { name: "Krita" })).toBeChecked();
});

test("filters and sorting live in the URL", async ({ page, isMobile }) => {
  await page.goto("/kollektion");
  const panel = isMobile ? page.getByRole("dialog", { name: "Filtrera" }) : page.getByRole("complementary", { name: "Filter" });
  // On a cold server the first tap can land before React hydrates; tap again until the drawer opens.
  if (isMobile) {
    await expect(async () => {
      await page.getByRole("button", { name: /Filtrera/ }).click();
      await expect(panel).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20000 });
  }
  await panel.getByRole("radio", { name: "Vaser" }).check();
  await expect(page).toHaveURL(/\/kollektion\/vaser/);
  // A category is its own page, so choosing one navigates (and closes the phone drawer).
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vaser");
  await expect(page.getByRole("dialog", { name: "Filtrera" })).toBeHidden();
  await expect(page.getByRole("article")).toHaveCount(1);

  await page.getByRole("combobox").selectOption("pris-fallande");
  await expect(page).toHaveURL(/sortera=pris-fallande/);

  // An impossible combination shows the empty state.
  await page.goto("/kollektion/vaser?farg=grafit");
  await expect(page.getByText("Inga produkter matchar filtren")).toBeVisible();
  await page.getByRole("link", { name: "Visa alla produkter" }).click();
  await expect(page).toHaveURL(/\/kollektion$/);
});

test("old ?kategori= links redirect to the category page", async ({ page }) => {
  await page.goto("/kollektion?kategori=belysning");
  await expect(page).toHaveURL(/\/kollektion\/belysning/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Belysning");
});

test("the sticky buy bar appears after scrolling past the buy button", async ({ page }) => {
  await page.goto("/produkter/ovo-vas");
  const bar = page.locator("[class*=StickyBuyBar_bar]");
  await expect(bar).toHaveAttribute("aria-hidden", "true");
  await page.getByRole("heading", { name: "Specifikationer" }).first().scrollIntoViewIfNeeded();
  await expect(bar).not.toHaveAttribute("aria-hidden", "true");
});

test("section links jump to the section", async ({ page }) => {
  await page.goto("/produkter/halo-bordslampa");
  await page.getByRole("navigation", { name: "Avsnitt på sidan" }).getByRole("link", { name: "FAQ" }).click();
  await expect(page).toHaveURL(/#faq/);
  await expect(page.getByRole("heading", { name: "Vanliga frågor" })).toBeInViewport();
});

test("the admin area requires sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/logga-in/);
});

test("account pages send signed-out visitors to sign-in and back", async ({ page }) => {
  await page.goto("/konto/ordrar");
  await expect(page).toHaveURL(/\/konto\/logga-in\?till=%2Fkonto%2Fordrar|\/konto\/logga-in\?till=\/konto\/ordrar/);
  await page.goto("/konto/ordrar/cs_test_someoneelse");
  await expect(page).toHaveURL(/\/konto\/logga-in/);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Logga in" })).toHaveAttribute("href", "/konto/logga-in");
});

test("data export requires a session", async ({ request }) => {
  const res = await request.get("/api/konto/export");
  expect(res.status()).toBe(401);
});
