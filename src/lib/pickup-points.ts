/**
 * Pickup points ("ombud"). The shop talks to the PickupPointProvider
 * interface only; the demo implementation below is a fixed list of made-up
 * Stockholm points. A carrier API (PostNord, DHL, Budbee) would implement the
 * same two methods and replace `pickupPoints` without other changes.
 */

export interface PickupPoint {
  id: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  hours: string;
}

export interface PickupPointProvider {
  /** The points nearest a Swedish postal code, nearest first. */
  near(postalCode: string, limit?: number): Promise<PickupPoint[]>;
  get(id: string): Promise<PickupPoint | null>;
}

/** Demo data: the names and addresses are invented. */
const DEMO_POINTS: PickupPoint[] = [
  { id: "demo-111", name: "Demo-ombud Centralen", street: "Exempelgatan 1", postalCode: "111 20", city: "Stockholm", hours: "Mån–sön 7–23" },
  { id: "demo-113", name: "Demo-ombud Odenplan", street: "Påhittade vägen 12", postalCode: "113 41", city: "Stockholm", hours: "Mån–fre 8–21, lör–sön 10–18" },
  { id: "demo-114", name: "Demo-ombud Östermalm", street: "Testgatan 4", postalCode: "114 39", city: "Stockholm", hours: "Mån–sön 8–22" },
  { id: "demo-116", name: "Demo-ombud Södermalm", street: "Låtsasgatan 30", postalCode: "116 46", city: "Stockholm", hours: "Mån–sön 7–22" },
  { id: "demo-117", name: "Demo-ombud Hornstull", street: "Provvägen 8", postalCode: "117 32", city: "Stockholm", hours: "Mån–fre 9–20, lör 10–16" },
  { id: "demo-112", name: "Demo-ombud Kungsholmen", street: "Modellgatan 21", postalCode: "112 34", city: "Stockholm", hours: "Mån–sön 8–21" },
  { id: "demo-120", name: "Demo-ombud Hammarby sjöstad", street: "Skissvägen 3", postalCode: "120 66", city: "Stockholm", hours: "Mån–sön 8–22" },
  { id: "demo-171", name: "Demo-ombud Solna", street: "Utkastgatan 15", postalCode: "171 45", city: "Solna", hours: "Mån–fre 8–20, lör–sön 10–17" },
];

const digits = (postalCode: string) => postalCode.replace(/\D/g, "");

export const isPostalCode = (input: string) => /^\d{5}$/.test(digits(input));

export const demoPickupPoints: PickupPointProvider = {
  async near(postalCode, limit = 4) {
    const target = isPostalCode(postalCode) ? Number(digits(postalCode)) : 11120;
    return [...DEMO_POINTS]
      .sort((a, b) => Math.abs(Number(digits(a.postalCode)) - target) - Math.abs(Number(digits(b.postalCode)) - target))
      .slice(0, limit);
  },
  async get(id) {
    return DEMO_POINTS.find((p) => p.id === id) ?? null;
  },
};

export const pickupPoints: PickupPointProvider = demoPickupPoints;
