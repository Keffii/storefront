"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CONTACT_TOPICS } from "@/data/service";
import styles from "./kundservice.module.css";

export function ContactForm() {
  const [state, setState] = useState<
    { status: "idle" | "sending" } | { status: "done"; ticket: string } | { status: "error"; message: string }
  >({ status: "idle" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/kontakt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as { ticket?: string; message?: string };
      setState(
        res.ok && json.ticket
          ? { status: "done", ticket: json.ticket }
          : { status: "error", message: json.message ?? "Något gick fel. Försök igen." },
      );
    } catch {
      setState({ status: "error", message: "Ingen anslutning. Försök igen." });
    }
  }

  if (state.status === "done") {
    return (
      <div className={styles.done} role="status">
        <p className={styles.doneTitle}>Tack, vi har fått ditt meddelande</p>
        <p>
          Ditt ärendenummer är <strong>{state.ticket}</strong>. Ange det om du skriver igen. Vi svarar vanligtvis inom en
          arbetsdag.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.twoCol}>
        <label className={styles.field}>
          <span>Namn</span>
          <input name="name" required maxLength={80} autoComplete="name" />
        </label>
        <label className={styles.field}>
          <span>E-post</span>
          <input name="email" type="email" required maxLength={120} autoComplete="email" />
        </label>
      </div>
      <div className={styles.twoCol}>
        <label className={styles.field}>
          <span>Ärende</span>
          <select name="topic" defaultValue="order">
            {Object.entries(CONTACT_TOPICS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Ordernummer (valfritt)</span>
          <input name="order" maxLength={12} placeholder="T.ex. 7HQ2K9XA" autoComplete="off" />
        </label>
      </div>
      <label className={styles.field}>
        <span>Meddelande</span>
        <textarea name="message" required minLength={10} maxLength={3000} rows={6} />
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.honeypot} aria-hidden="true" />
      {state.status === "error" && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={state.status === "sending"}>
        {state.status === "sending" ? "Skickar …" : "Skicka"}
      </Button>
      <p className={styles.note}>
        Vi använder uppgifterna bara för att svara dig. Läs mer i <Link href="/integritetspolicy">integritetspolicyn</Link>.
      </p>
    </form>
  );
}
