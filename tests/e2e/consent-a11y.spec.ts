import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("nothing is tracked until the visitor accepts statistics", async ({ page }) => {
  const events: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/events")) events.push(r.postData() ?? "");
  });

  await page.goto("/produkter/halo-bordslampa");
  const banner = page.getByRole("region", { name: "Cookies" });
  await expect(banner).toBeVisible();
  // The banner may cover the swatches on a phone; click the radio directly.
  await page.getByRole("radio", { name: "Krita" }).evaluate((el: HTMLInputElement) => el.click());
  await expect(page).toHaveURL(/variant=krita/);
  expect(events).toHaveLength(0);

  await banner.getByRole("button", { name: "Godkänn", exact: true }).click();
  await expect(banner).toBeHidden();
  await page.getByRole("radio", { name: "Dimblå" }).check({ force: true });
  await expect.poll(() => events.some((e) => e.includes("variant_picked"))).toBe(true);

  // The choice can be changed from the footer.
  await page.getByRole("button", { name: "Cookie-inställningar" }).click();
  await expect(page.getByRole("region", { name: "Cookies" })).toBeVisible();
});

test("dataLayer stays empty before consent and gets GA4 ecommerce events after", async ({ page }) => {
  await page.goto("/produkter/ovo-vas");
  await page.getByRole("button", { name: /Lägg i varukorgen/ }).first().click();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.dataLayer ?? [])).toEqual([]);

  await page.getByRole("region", { name: "Cookies" }).getByRole("button", { name: "Godkänn", exact: true }).click();
  await page.getByRole("button", { name: /Lägg i varukorgen/ }).first().click();
  const layer = (await page.evaluate(() => window.dataLayer ?? [])) as Record<string, unknown>[];
  const add = layer.find((e) => e.event === "add_to_cart") as { ecommerce: { currency: string; value: number; items: Record<string, unknown>[] } };
  expect(add).toBeDefined();
  expect(add.ecommerce.currency).toBe("SEK");
  expect(add.ecommerce.value).toBe(595);
  expect(add.ecommerce.items[0]).toMatchObject({ item_id: "OVO-TERRAKOTTA-S", item_name: "Ovo vas", price: 595, quantity: 1 });
  // GA4 recommends clearing the previous ecommerce object before each event.
  expect(layer[layer.indexOf(add) - 1]).toEqual({ ecommerce: null });
  // No tag manager loads without NEXT_PUBLIC_GTM_ID.
  expect(await page.locator("#gtm-script").count()).toBe(0);
});

test("declining keeps tracking off", async ({ page }) => {
  const events: string[] = [];
  page.on("request", (r) => r.url().includes("/api/events") && events.push(r.url()));
  await page.goto("/produkter/ovo-vas");
  await page.getByRole("button", { name: "Avböj", exact: true }).click();
  await page.getByRole("button", { name: /Lägg i varukorgen/ }).first().click();
  await page.waitForTimeout(500);
  expect(events).toHaveLength(0);
});

const pages = [
  "/",
  "/kollektion",
  // A category has filters with no matches, which are styled differently.
  "/kollektion/belysning",
  "/produkter/halo-bordslampa",
  "/om-projektet",
  "/kundservice",
  "/integritetspolicy",
  "/frakt-och-returer",
  "/presentkort",
];

for (const path of pages) {
  test(`no serious accessibility violations on ${path}`, async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: "objekt_consent", value: "necessary", url: baseURL! }]);
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

test("no serious accessibility violations with the cart open", async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: "objekt_consent", value: "necessary", url: baseURL! }]);
  await page.goto("/produkter/halo-bordslampa");
  await page.getByRole("button", { name: /Lägg i varukorgen/ }).first().click();
  await expect(page.getByRole("dialog", { name: /Varukorg/ })).toBeVisible();
  const results = await new AxeBuilder({ page }).include("dialog[open]").analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});

test("the whole purchase path works with the keyboard", async ({ page, baseURL, isMobile }) => {
  test.skip(isMobile, "keyboard flow is a desktop concern");
  await page.context().addCookies([{ name: "objekt_consent", value: "necessary", url: baseURL! }]);
  await page.goto("/produkter/halo-bordslampa");

  // Skip link is the first tab stop.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Hoppa till innehållet" })).toBeFocused();

  // Arrow keys move between colours.
  await page.getByRole("radio", { name: "Grafit" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Krita" })).toBeChecked();
  await expect(page).toHaveURL(/variant=krita-s/);

  // Add to cart with Enter; focus moves into the cart; Escape closes it.
  await page.getByRole("button", { name: /Lägg i varukorgen/ }).first().focus();
  await page.keyboard.press("Enter");
  const cart = page.getByRole("dialog", { name: /Varukorg/ });
  await expect(cart).toBeVisible();
  await expect(cart.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(cart).toBeHidden();
});

test("cookie preferences can be managed per category", async ({ page }) => {
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Cookies" });
  await banner.getByRole("button", { name: "Hantera inställningar" }).click();
  const stats = banner.getByRole("switch");
  await expect(stats).not.toBeChecked();
  await stats.check();
  await banner.getByRole("button", { name: "Spara mina val" }).click();
  await expect(banner).toBeHidden();
  expect((await page.context().cookies()).find((c) => c.name === "objekt_consent")?.value).toBe("all");
  // Reopened from the footer, the switch shows the saved choice.
  await page.getByRole("button", { name: "Cookie-inställningar" }).click();
  await page.getByRole("region", { name: "Cookies" }).getByRole("button", { name: "Hantera inställningar" }).click();
  await expect(page.getByRole("region", { name: "Cookies" }).getByRole("switch")).toBeChecked();
});
