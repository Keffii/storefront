/**
 * Rules for the abandoned-cart reminder, pure so they can be tested and
 * shared by the Next.js app and the scheduled function in amplify/.
 *
 * - Only signed-in customers who said yes to marketing email, and who
 *   haven't turned reminders off.
 * - One email, sent when the cart has been left alone for a while but not
 *   so long that it's stale.
 * - Never more than one reminder a week, even if the cart changes.
 */
export const REMIND_AFTER_HOURS = 3;
export const GIVE_UP_AFTER_HOURS = 48;
export const MIN_DAYS_BETWEEN_REMINDERS = 7;

export interface ReminderProfile {
  marketingConsent: { granted: boolean };
  cartReminders?: boolean;
}

export function wantsCartReminders(p: ReminderProfile): boolean {
  return p.marketingConsent.granted && p.cartReminders !== false;
}

export interface SavedCartState {
  updatedAt: string;
  remindedAt?: string | null;
  itemCount: number;
}

/** True when the scheduled job should send a reminder for this cart now. */
export function isDue(cart: SavedCartState, now = new Date()): boolean {
  if (cart.itemCount <= 0 || cart.remindedAt) return false;
  const idleHours = (now.getTime() - new Date(cart.updatedAt).getTime()) / 3_600_000;
  return idleHours >= REMIND_AFTER_HOURS && idleHours <= GIVE_UP_AFTER_HOURS;
}

/**
 * When the cart is saved again: keep a recent reminder time so a changed
 * cart can't trigger a second email the same week; forget an old one.
 */
export function remindedAtAfterSave(previous: string | null | undefined, now = new Date()): string | null {
  if (!previous) return null;
  const ageDays = (now.getTime() - new Date(previous).getTime()) / 86_400_000;
  return ageDays < MIN_DAYS_BETWEEN_REMINDERS ? previous : null;
}
