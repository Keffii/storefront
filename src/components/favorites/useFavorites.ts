"use client";

import { useSyncExternalStore } from "react";
import { favoritesStore } from "./favoritesStore";

const SIGNED_IN = /(?:^|;\s*)CognitoIdentityServiceProvider\.[^=]+\.LastAuthUser=/;

/** Saves the list on the account too, when signed in. Fire and forget. */
function pushToAccount(slugs: string[]) {
  if (!SIGNED_IN.test(document.cookie)) return;
  void fetch("/api/konto/favoriter", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slugs }),
  }).catch(() => {});
}

export function useFavorites() {
  const slugs = useSyncExternalStore(favoritesStore.subscribe, favoritesStore.getSnapshot, favoritesStore.getServerSnapshot);
  return {
    slugs,
    has: (slug: string) => slugs.includes(slug),
    toggle: (slug: string) => {
      favoritesStore.toggle(slug);
      pushToAccount(favoritesStore.getSnapshot());
    },
  };
}

let synced = false;

/** Once per page load: merge the account's saved favourites with this browser's. */
export async function syncFavoritesWithAccount() {
  if (synced || typeof document === "undefined" || !SIGNED_IN.test(document.cookie)) return;
  synced = true;
  try {
    const res = await fetch("/api/konto/favoriter", { cache: "no-store" });
    if (!res.ok) return;
    const { slugs } = (await res.json()) as { slugs: string[] };
    const merged = [...new Set([...favoritesStore.getSnapshot(), ...slugs])];
    favoritesStore.replace(merged);
    if (merged.length !== slugs.length) pushToAccount(merged);
  } catch {
    // Offline or signed out: keep the local list.
  }
}
