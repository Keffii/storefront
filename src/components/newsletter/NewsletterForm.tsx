"use client";

import { useId, useState, type FormEvent } from "react";
import styles from "./NewsletterForm.module.css";

/**
 * Newsletter sign-up, used in the footer and after purchase. No popup: it
 * sits where people look for it. Double opt-in: nothing is sent until the
 * emailed link is clicked.
 */
export function NewsletterForm({ source, tone = "light" }: { source: "footer" | "purchase"; tone?: "light" | "dark" }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" } | { status: "error"; message: string }>({
    status: "idle",
  });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const website = (new FormData(e.currentTarget).get("website") as string | null) ?? "";
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/nyhetsbrev", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setState(res.ok ? { status: "done" } : { status: "error", message: data.message ?? "Något gick fel. Försök igen." });
    } catch {
      setState({ status: "error", message: "Ingen anslutning. Försök igen." });
    }
  }

  if (state.status === "done") {
    return (
      <p className={`${styles.done} ${styles[tone]}`} role="status">
        Nästan klart. Bekräfta via länken vi mejlade till {email}.
      </p>
    );
  }

  return (
    <form className={`${styles.form} ${styles[tone]}`} onSubmit={submit}>
      <label htmlFor={id} className={styles.label}>
        Nyhetsbrev med nya produkter, högst en gång i månaden
      </label>
      <div className={styles.row}>
        <input
          id={id}
          type="email"
          required
          autoComplete="email"
          placeholder="din@epost.se"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
        />
        <button type="submit" className={styles.button} disabled={state.status === "sending"}>
          {state.status === "sending" ? "Skickar …" : "Prenumerera"}
        </button>
      </div>
      {/* Honeypot for bots, hidden from people and assistive tech. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.honeypot} aria-hidden="true" />
      <p className={styles.small}>Du kan avsluta när du vill via länken i varje mejl.</p>
      {state.status === "error" && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
