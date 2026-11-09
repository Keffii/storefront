"use server";

import { deleteSavedCart } from "@/lib/server/saved-carts";
import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/server/auth";
import { claimOrders, deleteCustomer, getProfile, saveProfile, type Profile } from "@/lib/server/customers";
import { rateLimit } from "@/lib/server/ratelimit";

/** Account actions re-check the session on the server; the browser never sends a user id. */

export async function claimGuestOrdersAction(formData: FormData): Promise<void> {
  const session = await requireCustomer();
  if (!(await rateLimit("claim", session.sub, 10, 3600))) throw new Error("Too many attempts");
  const ids = formData.getAll("order").map(String).filter((id) => /^cs_(test|live)_[A-Za-z0-9]+$/.test(id));
  await claimOrders(session, ids);
  revalidatePath("/konto/ordrar");
}

export type ProfileResult = { ok: true } | { ok: false; message: string };

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

export async function saveProfileAction(_: ProfileResult | null, formData: FormData): Promise<ProfileResult> {
  const session = await requireCustomer();
  const current = await getProfile(session.sub);
  const postalCode = clean(formData.get("postalCode"), 10).replace(/\s/g, "");
  if (postalCode && !/^\d{5}$/.test(postalCode)) return { ok: false, message: "Postnumret ska vara fem siffror." };
  const wantsMarketing = formData.get("marketing") === "on";
  const wantsCartReminders = formData.get("cartReminders") === "on";
  const profile: Profile = {
    ...current,
    name: clean(formData.get("name"), 80),
    address: {
      line1: clean(formData.get("line1"), 120),
      line2: clean(formData.get("line2"), 120),
      postalCode: postalCode ? `${postalCode.slice(0, 3)} ${postalCode.slice(3)}` : "",
      city: clean(formData.get("city"), 60),
    },
    // Store when consent changed, so it can be shown and proven later.
    marketingConsent:
      wantsMarketing === current.marketingConsent.granted
        ? current.marketingConsent
        : { granted: wantsMarketing, at: new Date().toISOString() },
    cartReminders: wantsCartReminders,
  };
  await saveProfile(session.sub, profile);
  // A saved cart only exists while the customer wants reminders.
  if (!wantsMarketing || !wantsCartReminders) await deleteSavedCart(session.sub);
  revalidatePath("/konto/uppgifter");
  return { ok: true };
}

export async function deleteAccountAction(_: ProfileResult | null, formData: FormData): Promise<ProfileResult> {
  const session = await requireCustomer();
  if (formData.get("confirm") !== "on") return { ok: false, message: "Kryssa i rutan för att bekräfta." };
  if (!(await rateLimit("delete", session.sub, 3, 3600))) return { ok: false, message: "För många försök. Försök igen senare." };
  try {
    await deleteCustomer(session);
    return { ok: true };
  } catch (err) {
    console.error("[account] delete failed", err);
    return { ok: false, message: "Kontot kunde inte raderas. Försök igen eller kontakta kundservice." };
  }
}
