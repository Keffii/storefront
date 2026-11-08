import { NextResponse, type NextRequest } from "next/server";
import { pickupPoints } from "@/lib/pickup-points";

/** Pickup points near a postal code. Demo data behind the provider interface. */
export async function GET(req: NextRequest) {
  const postalCode = (req.nextUrl.searchParams.get("postnummer") ?? "").slice(0, 10);
  const points = await pickupPoints.near(postalCode, 3);
  return NextResponse.json({ points, demo: true }, { headers: { "cache-control": "public, max-age=3600" } });
}
