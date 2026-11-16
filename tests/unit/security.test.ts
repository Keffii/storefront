import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Stripe key guard", () => {
  it("accepts only test-mode secret and restricted keys", async () => {
    const { isStripeTestKey } = await import("@/lib/server/stripe");
    expect(isStripeTestKey("sk_test_abc")).toBe(true);
    expect(isStripeTestKey("rk_test_abc")).toBe(true);
    expect(isStripeTestKey("sk_live_abc")).toBe(false);
    expect(isStripeTestKey("rk_live_abc")).toBe(false);
    expect(isStripeTestKey("pk_test_abc")).toBe(false);
    expect(isStripeTestKey("whsec_abc")).toBe(false);
  });
});

describe("receipt secret", () => {
  it("refuses to sign receipts in production without a long enough secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RECEIPT_SECRET", "");
    const missing = await import("@/lib/receipt-token");
    expect(() => missing.receiptToken("cs_test_1")).toThrow(/RECEIPT_SECRET/);

    vi.resetModules();
    vi.stubEnv("RECEIPT_SECRET", "too-short");
    const short = await import("@/lib/receipt-token");
    expect(() => short.receiptToken("cs_test_1")).toThrow(/RECEIPT_SECRET/);
  });

  it("never falls back to the IP hashing salt in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HASH_SALT", "a-salt-that-is-long-enough-to-pass-the-length-check");
    vi.stubEnv("RECEIPT_SECRET", "");
    const { receiptToken } = await import("@/lib/receipt-token");
    expect(() => receiptToken("cs_test_1")).toThrow(/RECEIPT_SECRET/);
  });

  it("signs with the configured secret in production, and tokens verify", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RECEIPT_SECRET", "x".repeat(32));
    const { receiptToken, isValidReceiptToken } = await import("@/lib/receipt-token");
    const token = receiptToken("cs_test_1");
    expect(isValidReceiptToken("cs_test_1", token)).toBe(true);
    expect(isValidReceiptToken("cs_test_2", token)).toBe(false);
  });

  it("keeps a development default for local runs and tests", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("RECEIPT_SECRET", "");
    const { receiptToken } = await import("@/lib/receipt-token");
    expect(receiptToken("cs_test_1")).toHaveLength(32);
  });
});

describe("rate-limit client key", () => {
  const headers = (h: Record<string, string>) => new Headers(h);

  it("uses CloudFront's viewer address, without the port", async () => {
    const { clientIp } = await import("@/lib/server/ratelimit");
    expect(clientIp(headers({ "cloudfront-viewer-address": "198.51.100.10:46532" }))).toBe("198.51.100.10");
    expect(clientIp(headers({ "cloudfront-viewer-address": "2001:DB8:1:FFFF:B1F:3C:8B:8F:46532" }))).toBe("2001:DB8:1:FFFF:B1F:3C:8B:8F");
  });

  it("a forged X-Forwarded-For can't change the key on CloudFront", async () => {
    const { clientKeyFromHeaders } = await import("@/lib/server/ratelimit");
    // What Amplify actually receives: the visitor's own entries first, then
    // the real address, then CloudFront's edge server.
    const real = clientKeyFromHeaders(
      headers({ "cloudfront-viewer-address": "198.51.100.10:6054", "x-forwarded-for": "198.51.100.10, 64.252.84.33" }),
    );
    for (const forged of ["203.0.113.7", "203.0.113.99", "203.0.113.7, 192.0.2.1"]) {
      const key = clientKeyFromHeaders(
        headers({
          "cloudfront-viewer-address": "198.51.100.10:6057",
          "x-forwarded-for": `${forged}, 198.51.100.10, 64.252.85.73`,
        }),
      );
      expect(key).toBe(real);
    }
  });

  it("outside CloudFront ignores the visitor-controlled first entries", async () => {
    const { clientIp } = await import("@/lib/server/ratelimit");
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.5" }))).toBe("10.0.0.5");
    expect(clientIp(headers({ "x-real-ip": "10.0.0.6" }))).toBe("10.0.0.6");
    expect(clientIp(headers({}))).toBe("unknown");
  });
});
