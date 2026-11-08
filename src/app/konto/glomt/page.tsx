import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/account/AuthForms";
import { isAuthConfigured } from "@/lib/server/auth";
import styles from "../konto.module.css";

export const metadata: Metadata = { title: "Glömt lösenord", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className={`container ${styles.authPage}`}>
      <p className="caption">Mitt konto</p>
      <h1 className={styles.title}>Glömt lösenordet</h1>
      {isAuthConfigured() ? <ResetPasswordForm /> : <p>Inloggning är inte konfigurerad i den här miljön.</p>}
    </div>
  );
}
