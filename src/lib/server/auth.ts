import "server-only";
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import outputs from "../../../amplify_outputs.json";

/**
 * Server-side admin check. Amplify's Next.js adapter reads the Cognito
 * tokens from cookies and verifies them; we then require the "admin" group
 * claim. Every admin page and server action calls requireAdmin().
 */

const hasAuth = Boolean((outputs as { auth?: unknown }).auth);

export const isAuthConfigured = () => hasAuth;

const runner = hasAuth ? createServerRunner({ config: outputs }) : null;

export type AdminState =
  | { kind: "not-configured" }
  | { kind: "signed-out" }
  | { kind: "forbidden"; email: string | null }
  | { kind: "admin"; email: string | null };

export async function getAdminState(): Promise<AdminState> {
  if (!runner) return { kind: "not-configured" };
  try {
    const session = await runner.runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (ctx) => fetchAuthSession(ctx),
    });
    const payload = session.tokens?.idToken?.payload;
    if (!payload) return { kind: "signed-out" };
    const email = typeof payload.email === "string" ? payload.email : null;
    const groups = payload["cognito:groups"];
    const isAdmin = Array.isArray(groups) && groups.includes("admin");
    return isAdmin ? { kind: "admin", email } : { kind: "forbidden", email };
  } catch {
    return { kind: "signed-out" };
  }
}

export interface CustomerSession {
  sub: string;
  email: string;
  emailVerified: boolean;
  groups: string[];
}

/** The signed-in user (customer or admin), verified on the server, or null. */
export async function getSession(): Promise<CustomerSession | null> {
  if (!runner) return null;
  try {
    const session = await runner.runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (ctx) => fetchAuthSession(ctx),
    });
    const p = session.tokens?.idToken?.payload;
    if (!p || typeof p.sub !== "string" || typeof p.email !== "string") return null;
    const groups = Array.isArray(p["cognito:groups"]) ? (p["cognito:groups"] as string[]) : [];
    return { sub: p.sub, email: p.email, emailVerified: p.email_verified === true, groups };
  } catch {
    return null;
  }
}

export async function requireCustomer(): Promise<CustomerSession> {
  const s = await getSession();
  if (!s) throw new Error("Not signed in");
  return s;
}

export async function requireAdmin(): Promise<{ email: string | null }> {
  const state = await getAdminState();
  if (state.kind !== "admin") throw new Error("Forbidden");
  return { email: state.email };
}
