import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSignIn } from "@/components/admin/AdminSignIn";
import { getAdminState } from "@/lib/server/auth";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Logga in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminSignInPage() {
  const state = await getAdminState();
  if (state.kind === "admin") redirect("/admin");

  return (
    <div className={`container ${styles.signIn}`}>
      <p className="caption">Admin</p>
      <h1 className={styles.title}>Logga in</h1>
      {state.kind === "not-configured" ? (
        <p className={styles.notice}>
          Inloggningen är inte konfigurerad i den här miljön. Adminvyn kräver Amplify Auth (Cognito).
        </p>
      ) : (
        <>
          <p className={styles.lead}>Adminvyn är bara öppen för inbjudna konton i gruppen admin.</p>
          <AdminSignIn />
        </>
      )}
    </div>
  );
}
