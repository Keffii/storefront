import { describe, expect, it } from "vitest";
import {
  easterSunday,
  estimateDelivery,
  formatCountdown,
  formatDeliveryRange,
  isWorkingDay,
  stockholmNow,
} from "@/lib/delivery";

const config = { cutoffHour: 14, minDays: 1, maxDays: 3 };
/** A UTC instant from a Stockholm wall-clock time in November (UTC+1). */
const stockholmNov = (day: number, hour: number, minute = 0) => new Date(Date.UTC(2026, 10, day, hour - 1, minute));

describe("Easter and holidays", () => {
  it("computes Easter Sunday", () => {
    expect(easterSunday(2026)).toEqual({ year: 2026, month: 4, day: 5 });
    expect(easterSunday(2027)).toEqual({ year: 2027, month: 3, day: 28 });
    expect(easterSunday(2025)).toEqual({ year: 2025, month: 4, day: 20 });
  });

  it("treats Swedish holidays and weekends as non-working days", () => {
    expect(isWorkingDay({ year: 2026, month: 4, day: 3 })).toBe(false); // Långfredagen
    expect(isWorkingDay({ year: 2026, month: 4, day: 6 })).toBe(false); // Annandag påsk
    expect(isWorkingDay({ year: 2026, month: 5, day: 14 })).toBe(false); // Kristi himmelsfärd
    expect(isWorkingDay({ year: 2026, month: 6, day: 19 })).toBe(false); // Midsommarafton
    expect(isWorkingDay({ year: 2026, month: 12, day: 24 })).toBe(false); // Julafton
    expect(isWorkingDay({ year: 2026, month: 11, day: 7 })).toBe(false); // Saturday
    expect(isWorkingDay({ year: 2026, month: 11, day: 9 })).toBe(true); // Monday
  });
});

describe("estimateDelivery", () => {
  it("ships today before the cut-off on a weekday", () => {
    const e = estimateDelivery(stockholmNov(10, 9, 30), config); // Tuesday 09:30
    expect(e.shipsToday).toBe(true);
    expect(e.shipDate).toEqual({ year: 2026, month: 11, day: 10 });
    expect(e.earliest).toEqual({ year: 2026, month: 11, day: 11 });
    expect(e.latest).toEqual({ year: 2026, month: 11, day: 13 });
    expect(e.minutesToCutoff).toBe(270);
  });

  it("ships the next working day after the cut-off", () => {
    const e = estimateDelivery(stockholmNov(13, 15), config); // Friday 15:00
    expect(e.shipsToday).toBe(false);
    expect(e.shipDate).toEqual({ year: 2026, month: 11, day: 16 }); // Monday
    expect(e.earliest).toEqual({ year: 2026, month: 11, day: 17 });
    expect(e.latest).toEqual({ year: 2026, month: 11, day: 19 });
    expect(e.minutesToCutoff).toBeNull();
  });

  it("skips the weekend for orders placed on a Saturday", () => {
    const e = estimateDelivery(stockholmNov(7, 10), config);
    expect(e.shipDate).toEqual({ year: 2026, month: 11, day: 9 });
  });

  it("skips Christmas", () => {
    const e = estimateDelivery(new Date(Date.UTC(2026, 11, 23, 15)), config); // Wed 23 Dec, 16:00 Stockholm
    expect(e.shipDate).toEqual({ year: 2026, month: 12, day: 28 });
    expect(e.earliest).toEqual({ year: 2026, month: 12, day: 29 });
  });

  it("uses Stockholm time, not UTC, around midnight", () => {
    // 23:30 UTC on Sunday 8 Nov is 00:30 Monday in Stockholm.
    expect(stockholmNow(new Date(Date.UTC(2026, 10, 8, 23, 30)))).toMatchObject({ day: 9, hour: 0 });
    const e = estimateDelivery(new Date(Date.UTC(2026, 10, 8, 23, 30)), config);
    expect(e.shipsToday).toBe(true);
  });

  it("handles summer time (UTC+2)", () => {
    // 11:59 UTC on 10 June 2026 is 13:59 in Stockholm: still before cut-off.
    expect(estimateDelivery(new Date(Date.UTC(2026, 5, 10, 11, 59)), config).shipsToday).toBe(true);
    expect(estimateDelivery(new Date(Date.UTC(2026, 5, 10, 12, 0)), config).shipsToday).toBe(false);
  });
});

describe("formatting", () => {
  it("formats ranges in Swedish", () => {
    const e = estimateDelivery(stockholmNov(10, 9), config);
    expect(formatDeliveryRange(e)).toBe("ons 11 – fre 13 nov");
  });

  it("formats countdowns", () => {
    expect(formatCountdown(45)).toBe("45 min");
    expect(formatCountdown(120)).toBe("2 h");
    expect(formatCountdown(135)).toBe("2 h 15 min");
  });
});
