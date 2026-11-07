import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: "objekt_consent", value: "necessary", url: baseURL! }]);
});

test("pick a variant and an add-on, add to cart, and start checkout", async ({ page }) => {
  await page.goto("/produkter/halo-bordslampa");
  const buyBox = page.getByRole("complementary", { name: "Köp Halo bordslampa" });

  // Variant: colour + size update price, stock and URL.
  await buyBox.getByRole("radio", { name: "Krita" }).check({ force: true });
  await buyBox.getByRole("radio", { name: /Stor/ }).check({ force: true });
  await expect(page).toHaveURL(/variant=krita-l/);
  await expect(buyBox.getByText("I lager, 3 kvar")).toBeVisible();
  await expect(buyBox.getByText("1 995 kr").first()).toBeVisible();

  // Sold-out combination disables the button.
  await buyBox.getByRole("radio", { name: /Dimblå/ }).check({ force: true });
  await expect(buyBox.getByRole("button", { name: "Slutsåld" })).toBeDisabled();
  await buyBox.getByRole("radio", { name: "Grafit" }).check({ force: true });

  // Add-on at bundle price.
  await buyBox.getByRole("checkbox").check();
  await buyBox.getByRole("button", { name: /Lägg i varukorgen/ }).click();

  const cart = page.getByRole("dialog", { name: /Varukorg/ });
  await expect(cart).toBeVisible();
  await expect(cart.getByRole("link", { name: /Halo bordslampa \(Grafit, Stor/ })).toBeVisible();
  await expect(cart.getByText("Paketrabatt")).toBeVisible();
  await expect(cart.getByText("Du har fri frakt!")).toBeVisible();

  // The cart survives a reload.
  await page.reload();
  await page.getByRole("button", { name: /Varukorg, 2 varor/ }).click();
  await expect(page.getByRole("dialog", { name: /Varukorg/ })).toBeVisible();

  // Checkout: Stripe when configured, otherwise a clear message.
  const [response] = await Promise.all([
    page.waitForResponse("**/api/checkout"),
    page.getByRole("button", { name: "Till kassan" }).click(),
  ]);
  if (response.status() === 503) {
    await expect(page.getByRole("dialog", { name: /Varukorg/ }).getByRole("alert")).toContainText("Betalningar är inte aktiverade");
  } else {
    expect(response.status()).toBe(200);
    await page.waitForURL(/checkout\.stripe\.com/);
  }
});

test("quantity changes and removal update the totals", async ({ page }) => {
  await page.goto("/produkter/lag-skal");
  await page.getByRole("button", { name: /Lägg i varukorgen/ }).first().click();
  const cart = page.getByRole("dialog", { name: /Varukorg/ });
  await expect(cart.getByText(/Handla för .* till för fri frakt/)).toBeVisible();
  await cart.getByRole("button", { name: "Öka antal" }).click();
  await cart.getByRole("button", { name: "Öka antal" }).click();
  await expect(cart.getByText("Du har fri frakt!")).toBeVisible(); // 3 × 395 kr ≥ 999 kr
  await cart.getByRole("button", { name: /Ta bort/ }).click();
  await expect(cart.getByText("Din varukorg är tom.")).toBeVisible();
});

test("the confirmation page handles a missing session", async ({ page }) => {
  await page.goto("/tack?session_id=cs_test_doesnotexist");
  await expect(page.getByRole("heading", { name: "Vi hittade ingen beställning" })).toBeVisible();
});
