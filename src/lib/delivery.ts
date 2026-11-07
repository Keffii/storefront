/**
 * Delivery estimate from the moment of ordering.
 *
 * Rules: orders placed on a working day before the cut-off hour (Stockholm
 * time) ship the same day; otherwise they ship on the next working day.
 * Delivery takes `min`–`max` working days after shipping. Weekends and
 * Swedish public holidays are not working days.
 *
 * All calendar maths runs on plain Y-M-D "civil dates" so the result does
 * not depend on the server's or browser's time zone.
 */

export interface CivilDate {
  year: number;
  month: number; // 1–12
  day: number;
}

export interface DeliveryConfig {
  cutoffHour: number;
  minDays: number;
  maxDays: number;
}

export interface DeliveryEstimate {
  /** True when the order ships today. */
  shipsToday: boolean;
  shipDate: CivilDate;
  earliest: CivilDate;
  latest: CivilDate;
  /** Minutes left until today's cut-off, when it ships today. */
  minutesToCutoff: number | null;
}

const TIME_ZONE = "Europe/Stockholm";

/** The civil date and time in Stockholm for an instant. */
export function stockholmNow(instant: Date): CivilDate & { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

function toUtc(d: CivilDate): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
}

function fromUtc(date: Date): CivilDate {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function addDays(d: CivilDate, days: number): CivilDate {
  const date = toUtc(d);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(d: CivilDate): number {
  return toUtc(d).getUTCDay();
}

const key = (d: CivilDate) => `${d.year}-${d.month}-${d.day}`;

/** Easter Sunday (Gregorian), anonymous algorithm. */
export function easterSunday(year: number): CivilDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

/** The first date from `from` (inclusive) that falls on `wd`. */
function firstWeekdayFrom(from: CivilDate, wd: number): CivilDate {
  return addDays(from, (wd - weekday(from) + 7) % 7);
}

const holidayCache = new Map<number, Set<string>>();

/**
 * Days on which carriers don't deliver: public holidays plus the "de facto"
 * holidays midsummer eve, Christmas eve and New Year's eve.
 */
export function swedishHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const days: CivilDate[] = [
    { year, month: 1, day: 1 }, // Nyårsdagen
    { year, month: 1, day: 6 }, // Trettondedag jul
    addDays(easter, -2), // Långfredagen
    addDays(easter, 1), // Annandag påsk
    { year, month: 5, day: 1 }, // Första maj
    addDays(easter, 39), // Kristi himmelsfärds dag
    { year, month: 6, day: 6 }, // Nationaldagen
    firstWeekdayFrom({ year, month: 6, day: 19 }, 5), // Midsommarafton (fredag 19–25 juni)
    { year, month: 12, day: 24 }, // Julafton
    { year, month: 12, day: 25 }, // Juldagen
    { year, month: 12, day: 26 }, // Annandag jul
    { year, month: 12, day: 31 }, // Nyårsafton
  ];
  const set = new Set(days.map(key));
  holidayCache.set(year, set);
  return set;
}

export function isWorkingDay(d: CivilDate): boolean {
  const wd = weekday(d);
  if (wd === 0 || wd === 6) return false;
  return !swedishHolidays(d.year).has(key(d));
}

/** The next working day strictly after `d`. */
export function nextWorkingDay(d: CivilDate): CivilDate {
  let next = addDays(d, 1);
  while (!isWorkingDay(next)) next = addDays(next, 1);
  return next;
}

function addWorkingDays(d: CivilDate, n: number): CivilDate {
  let result = d;
  for (let i = 0; i < n; i++) result = nextWorkingDay(result);
  return result;
}

export function estimateDelivery(instant: Date, config: DeliveryConfig): DeliveryEstimate {
  const now = stockholmNow(instant);
  const today: CivilDate = { year: now.year, month: now.month, day: now.day };
  const shipsToday = isWorkingDay(today) && now.hour < config.cutoffHour;
  const shipDate = shipsToday ? today : nextWorkingDay(today);
  return {
    shipsToday,
    shipDate,
    earliest: addWorkingDays(shipDate, config.minDays),
    latest: addWorkingDays(shipDate, config.maxDays),
    minutesToCutoff: shipsToday ? config.cutoffHour * 60 - (now.hour * 60 + now.minute) : null,
  };
}

const WEEKDAYS = ["sön", "mån", "tis", "ons", "tors", "fre", "lör"];
const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** { 2026, 11, 10 } → "tis 10 nov" */
export function formatCivilDate(d: CivilDate): string {
  return `${WEEKDAYS[weekday(d)]} ${d.day} ${MONTHS[d.month - 1]}`;
}

/** "tis 10 – tors 12 nov", or "tis 10 nov" when both ends are the same day. */
export function formatDeliveryRange(e: DeliveryEstimate): string {
  if (key(e.earliest) === key(e.latest)) return formatCivilDate(e.earliest);
  if (e.earliest.month === e.latest.month) {
    return `${WEEKDAYS[weekday(e.earliest)]} ${e.earliest.day} – ${formatCivilDate(e.latest)}`;
  }
  return `${formatCivilDate(e.earliest)} – ${formatCivilDate(e.latest)}`;
}

/** 135 → "2 h 15 min" */
export function formatCountdown(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
