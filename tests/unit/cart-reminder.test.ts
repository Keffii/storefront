import { describe, expect, it } from "vitest";
import { isDue, remindedAtAfterSave, wantsCartReminders } from "@/lib/cart-reminder";

const now = new Date("2026-11-10T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe("who gets cart reminders", () => {
  it("needs marketing consent", () => {
    expect(wantsCartReminders({ marketingConsent: { granted: false } })).toBe(false);
    expect(wantsCartReminders({ marketingConsent: { granted: true } })).toBe(true);
  });
  it("respects turning reminders off", () => {
    expect(wantsCartReminders({ marketingConsent: { granted: true }, cartReminders: false })).toBe(false);
  });
});

describe("when a reminder is due", () => {
  it("waits a few hours after the last change", () => {
    expect(isDue({ updatedAt: hoursAgo(1), itemCount: 2 }, now)).toBe(false);
    expect(isDue({ updatedAt: hoursAgo(4), itemCount: 2 }, now)).toBe(true);
  });
  it("gives up on old carts", () => {
    expect(isDue({ updatedAt: hoursAgo(72), itemCount: 2 }, now)).toBe(false);
  });
  it("sends only once", () => {
    expect(isDue({ updatedAt: hoursAgo(5), remindedAt: hoursAgo(1), itemCount: 2 }, now)).toBe(false);
  });
  it("ignores empty carts", () => {
    expect(isDue({ updatedAt: hoursAgo(5), itemCount: 0 }, now)).toBe(false);
  });
});

describe("saving the cart again", () => {
  it("keeps a reminder from this week, so a changed cart gets no second email", () => {
    expect(remindedAtAfterSave(daysAgo(2), now)).toBe(daysAgo(2));
  });
  it("forgets a reminder older than a week", () => {
    expect(remindedAtAfterSave(daysAgo(10), now)).toBeNull();
    expect(remindedAtAfterSave(null, now)).toBeNull();
  });
});
