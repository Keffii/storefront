import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInForm } from "@/components/account/AuthForms";
import { getSession, isAuthConfigured } from "@/lib/server/auth";
import styles from "../konto.module.css";

export const metadata: Metadata = { title: "Logga in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ verifierad?: string; nyttlosen?: string; till?: string }>;
}) {
  const q = await searchParams;
  if (await getSession()) redirect(q.till?.startsWith("/") && !q.till.startsWith("//") ? q.till : "/konto/ordrar");

  return (
    <div className={`container ${styles.authPage}`}>
      <p className="caption">Mitt konto</p>
      <h1 className={styles.title}>Logga in</h1>
      {q.verifierad && <p className={styles.notice}>E-postadressen är bekräftad. Logga in för att fortsätta.</p>}
      {q.nyttlosen && <p className={styles.notice}>Lösenordet är bytt. Logga in med det nya.</p>}
      {isAuthConfigured() ? (
        <Suspense>
          <SignInForm />
        </Suspense>
      ) : (
        <p>Inloggning är inte konfigurerad i den här miljön.</p>
      )}
    </div>
  );
}
