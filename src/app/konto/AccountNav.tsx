import Link from "next/link";
import { AccountSignOut } from "@/components/account/AuthForms";
import styles from "./konto.module.css";

export function AccountHeader({ email, current }: { email: string; current: "ordrar" | "uppgifter" }) {
  return (
    <header className={styles.accountHead}>
      <div>
        <p className="caption">Mitt konto</p>
        <p className={styles.email}>{email}</p>
      </div>
      <nav aria-label="Mitt konto" className={styles.tabs}>
        <Link href="/konto/ordrar" aria-current={current === "ordrar" ? "page" : undefined}>
          Mina ordrar
        </Link>
        <Link href="/konto/uppgifter" aria-current={current === "uppgifter" ? "page" : undefined}>
          Mina uppgifter
        </Link>
        <AccountSignOut />
      </nav>
    </header>
  );
}
