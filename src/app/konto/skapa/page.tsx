import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignUpForm } from "@/components/account/AuthForms";
import { getSession, isAuthConfigured } from "@/lib/server/auth";
import styles from "../konto.module.css";

export const metadata: Metadata = { title: "Skapa konto", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await getSession()) redirect("/konto/ordrar");
  return (
    <div className={`container ${styles.authPage}`}>
      <p className="caption">Mitt konto</p>
      <h1 className={styles.title}>Skapa konto</h1>
      {isAuthConfigured() ? (
        <Suspense>
          <SignUpForm />
        </Suspense>
      ) : (
        <p>Inloggning är inte konfigurerad i den här miljön.</p>
      )}
    </div>
  );
}
