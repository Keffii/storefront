"use client";

import { signOut } from "aws-amplify/auth";
import { useActionState, useEffect } from "react";
import { ensureAmplify } from "@/components/account/amplify-client";
import { Button } from "@/components/ui/Button";
import type { Profile } from "@/lib/server/customers";
import { deleteAccountAction, saveProfileAction } from "../actions";
import styles from "../konto.module.css";

export function ProfileForm({ profile, consentText }: { profile: Profile; consentText: string | null }) {
  const [state, action, pending] = useActionState(saveProfileAction, null);
  return (
    <form action={action} className={styles.formGrid}>
      <label className={styles.field}>
        <span>Namn</span>
        <input name="name" defaultValue={profile.name} autoComplete="name" />
      </label>
      <label className={styles.field}>
        <span>Gatuadress</span>
        <input name="line1" defaultValue={profile.address.line1} autoComplete="address-line1" />
      </label>
      <label className={styles.field}>
        <span>C/o, lägenhet (valfritt)</span>
        <input name="line2" defaultValue={profile.address.line2} autoComplete="address-line2" />
      </label>
      <div className={styles.row2}>
        <label className={styles.field}>
          <span>Postnummer</span>
          <input name="postalCode" defaultValue={profile.address.postalCode} autoComplete="postal-code" inputMode="numeric" />
        </label>
        <label className={styles.field}>
          <span>Ort</span>
          <input name="city" defaultValue={profile.address.city} autoComplete="address-level2" />
        </label>
      </div>
      <p className={styles.muted}>Adressen fylls i automatiskt i kassan nästa gång du handlar.</p>
      <label className={styles.check}>
        <input type="checkbox" name="marketing" defaultChecked={profile.marketingConsent.granted} />
        <span>
          Ja, jag vill få nyheter och erbjudanden via e-post. Du kan ändra dig när som helst.
          {consentText && (
            <>
              <br />
              <span className={styles.muted}>{consentText}</span>
            </>
          )}
        </span>
      </label>
      {state && (
        <p className={state.ok ? styles.ok : styles.error} role="status">
          {state.ok ? "Uppgifterna är sparade." : state.message}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sparar …" : "Spara"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, null);

  // The Cognito user is gone: clear the local session and leave.
  useEffect(() => {
    if (state?.ok) {
      ensureAmplify();
      signOut()
        .catch(() => {})
        .finally(() => window.location.assign("/?konto=raderat"));
    }
  }, [state]);

  return (
    <form action={action} className={styles.formGrid}>
      <label className={styles.check}>
        <input type="checkbox" name="confirm" />
        <span>Jag förstår att kontot raderas och inte går att återställa.</span>
      </label>
      {state && !state.ok && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      <div>
        <Button type="submit" variant="secondary" disabled={pending || state?.ok}>
          {pending ? "Raderar …" : "Radera mitt konto"}
        </Button>
      </div>
    </form>
  );
}
