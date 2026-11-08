"use client";

/**
 * Favourite product slugs in localStorage, synced across tabs. For signed-in
 * customers the list is merged with the one saved on their account (see
 * FavoritesSync), so favourites follow them between devices.
 */
const KEY = "objekt.favorites.v1";
const EMPTY: string[] = [];
let slugs: string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? [...new Set(parsed.filter((s): s is string => typeof s === "string"))].slice(0, 100) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function load() {
  if (!loaded && typeof window !== "undefined") {
    slugs = read();
    loaded = true;
  }
}

function write(next: string[]) {
  slugs = [...new Set(next)].slice(0, 100);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    // Storage unavailable: favourites last for this page view.
  }
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key === KEY) {
    slugs = read();
    listeners.forEach((l) => l());
  }
}

export const favoritesStore = {
  subscribe(listener: () => void) {
    load();
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: () => {
    load();
    return slugs;
  },
  getServerSnapshot: () => EMPTY,
  toggle(slug: string) {
    load();
    write(slugs.includes(slug) ? slugs.filter((s) => s !== slug) : [slug, ...slugs]);
  },
  replace(next: string[]) {
    load();
    write(next);
  },
};
