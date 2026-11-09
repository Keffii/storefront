import { expect, test } from "@playwright/test";

test("security headers are set", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("nothing on the main pages breaks the Content Security Policy", async ({ page, baseURL }) => {
  // Seven pages, each waiting for the network to go quiet. On a fresh CI server
  // every product photo is optimised on first view, which can take longer than 30 s.
  test.slow();
  const violations: string[] = [];
  let current = "";
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy|Refused to/i.test(m.text())) violations.push(`${current}: ${m.text()}`);
  });
  page.on("pageerror", (e) => violations.push(`${current}: ${e.message.slice(0, 160)}`));
  await page.context().addCookies([{ name: "objekt_consent", value: "all", url: baseURL! }]);

  for (const path of ["/", "/kollektion", "/produkter/halo-bordslampa", "/kundservice", "/presentkort", "/konto/logga-in", "/sok?q=vas"]) {
    current = path;
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  // Interactions that load more code: cart, search, quick add.
  current = "/produkter/ovo-vas (cart)";
  await page.goto("/produkter/ovo-vas");
  await page.getByRole("button", { name: /Lägg i varukorgen/ }).first().click();
  await expect(page.getByRole("dialog", { name: /Varukorg/ })).toBeVisible();
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(500);
  expect(violations).toEqual([]);
});
