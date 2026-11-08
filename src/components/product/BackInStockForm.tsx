"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./BackInStockForm.module.css";

/** Shown on sold-out variants instead of the buy button. */
export function BackInStockForm({ slug, variantId, label }: { slug: string; variantId: string; label: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; message?: string }>({ status: "idle" });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/bevaka", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, variantId, email }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) setState({ status: "done" });
      else setState({ status: "error", message: data.message ?? "Något gick fel. Försök igen." });
    } catch {
      setState({ status: "error", message: "Ingen anslutning. Försök igen." });
    }
  }

  if (state.status === "done") {
    return (
      <p className={styles.done} role="status">
        Klart! Bekräfta bevakningen via länken vi mejlade till {email}. Sedan hör vi av oss en gång när {label} finns igen.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} key={variantId}>
      <p className={styles.title}>Bevaka varianten</p>
      <p className={styles.text}>Vi mejlar dig en gång när den finns i lager igen. Inga andra utskick.</p>
      <div className={styles.row}>
        <label className="visually-hidden" htmlFor={`bevaka-${variantId}`}>
          E-post
        </label>
        <input
          id={`bevaka-${variantId}`}
          type="email"
          required
          autoComplete="email"
          placeholder="din@epost.se"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
        />
        <Button type="submit" variant="secondary" disabled={state.status === "sending"}>
          {state.status === "sending" ? "Skickar …" : "Bevaka"}
        </Button>
      </div>
      {state.status === "error" && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
