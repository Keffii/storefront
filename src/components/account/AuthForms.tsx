"use client";

import {
  confirmResetPassword,
  confirmSignIn,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from "aws-amplify/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { authErrorMessage, ensureAmplify } from "./amplify-client";
import styles from "./AuthForms.module.css";

/** Only same-site paths are allowed as a post-login destination. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/konto/ordrar";
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  hint,
  inputMode,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  hint?: ReactNode;
  inputMode?: "numeric" | "email";
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const input = (
    <input
      id={id}
      type={isPassword && visible ? "text" : type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      inputMode={inputMode}
      autoCapitalize={isPassword ? "none" : undefined}
      spellCheck={isPassword ? false : undefined}
      required
    />
  );
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {isPassword ? (
        <div className={styles.passwordWrap}>
          {input}
          {/* Shows what was typed, so a mistyped password is easy to spot. */}
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Dölj lösenordet" : "Visa lösenordet"}
            aria-pressed={visible}
            aria-controls={id}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
              {visible && <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.4" />}
            </svg>
          </button>
        </div>
      ) : (
        input
      )}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

const PASSWORD_HINT = "Minst 8 tecken med stor och liten bokstav, en siffra och ett specialtecken.";

function useFinish() {
  const router = useRouter();
  const params = useSearchParams();
  return () => {
    router.replace(safeNext(params.get("till")));
    router.refresh();
  };
}

export function SignInForm() {
  ensureAmplify();
  const finish = useFinish();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (needsNewPassword) {
        const res = await confirmSignIn({ challengeResponse: newPassword });
        if (res.isSignedIn) return finish();
      } else {
        // A stale session from another tab would make signIn throw.
        await signOut().catch(() => {});
        const res = await signIn({ username: email.trim(), password });
        if (res.isSignedIn) return finish();
        if (res.nextStep.signInStep === "CONFIRM_SIGN_UP") {
          await resendSignUpCode({ username: email.trim() }).catch(() => {});
          router.push(`/konto/skapa?bekrafta=${encodeURIComponent(email.trim())}`);
          return;
        }
        if (res.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
          setNeedsNewPassword(true);
          setBusy(false);
          return;
        }
        setError("Inloggningen kunde inte slutföras.");
      }
    } catch (err) {
      setError(authErrorMessage(err));
    }
    setBusy(false);
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {needsNewPassword ? (
        <>
          <p className={styles.lead}>Välj ett eget lösenord för kontot.</p>
          <Field label="Nytt lösenord" type="password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" hint={PASSWORD_HINT} />
        </>
      ) : (
        <>
          <Field label="E-post" type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" />
          <Field label="Lösenord" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? "Loggar in …" : needsNewPassword ? "Spara och logga in" : "Logga in"}
      </Button>
      <p className={styles.links}>
        <Link href="/konto/glomt">Glömt lösenordet?</Link>
        <Link href="/konto/skapa">Skapa konto</Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  ensureAmplify();
  const finish = useFinish();
  const params = useSearchParams();
  const pending = params.get("bekrafta");
  const [step, setStep] = useState<"details" | "confirm">(pending ? "confirm" : "details");
  const [email, setEmail] = useState(pending ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(pending ? `Vi har skickat en kod till ${pending}.` : null);
  const [busy, setBusy] = useState(false);

  async function submitDetails(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signUp({
        username: email.trim(),
        password,
        options: { userAttributes: { email: email.trim() } },
      });
      if (res.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setStep("confirm");
        setInfo(`Vi har skickat en sexsiffrig kod till ${email.trim()}. Den kan hamna i skräpposten.`);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    }
    setBusy(false);
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await confirmSignUp({ username: email.trim(), confirmationCode: code.trim() });
      if (password) {
        await signOut().catch(() => {});
        const res = await signIn({ username: email.trim(), password });
        if (res.isSignedIn) return finish();
      }
      // Came here from the sign-in page: ask them to sign in again.
      window.location.assign(`/konto/logga-in?verifierad=1`);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await resendSignUpCode({ username: email.trim() });
      setInfo(`En ny kod är skickad till ${email.trim()}.`);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  if (step === "confirm") {
    return (
      <form className={styles.form} onSubmit={submitCode}>
        {info && <p className={styles.lead}>{info}</p>}
        <Field label="Kod från mejlet" value={code} onChange={setCode} autoComplete="one-time-code" inputMode="numeric" />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth disabled={busy}>
          {busy ? "Bekräftar …" : "Bekräfta e-post"}
        </Button>
        <p className={styles.links}>
          <button type="button" className={styles.linkButton} onClick={resend}>
            Skicka koden igen
          </button>
        </p>
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={submitDetails}>
      <Field label="E-post" type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" />
      <Field label="Lösenord" type="password" value={password} onChange={setPassword} autoComplete="new-password" hint={PASSWORD_HINT} />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? "Skapar konto …" : "Skapa konto"}
      </Button>
      <p className={styles.small}>
        Med ett konto ser du dina ordrar och kan spara din adress. Vi skickar inga nyhetsbrev om du inte själv väljer det.
      </p>
      <p className={styles.links}>
        <span>Har du redan ett konto?</span>
        <Link href="/konto/logga-in">Logga in</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  ensureAmplify();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await resetPassword({ username: email.trim() });
      setStep("code");
    } catch (err) {
      setError(authErrorMessage(err));
    }
    setBusy(false);
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await confirmResetPassword({ username: email.trim(), confirmationCode: code.trim(), newPassword: password });
      window.location.assign("/konto/logga-in?nyttlosen=1");
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return step === "email" ? (
    <form className={styles.form} onSubmit={submitEmail}>
      <p className={styles.lead}>Ange din e-post så skickar vi en kod för att välja nytt lösenord.</p>
      <Field label="E-post" type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? "Skickar …" : "Skicka kod"}
      </Button>
      <p className={styles.links}>
        <Link href="/konto/logga-in">Tillbaka till inloggningen</Link>
      </p>
    </form>
  ) : (
    <form className={styles.form} onSubmit={submitCode}>
      <p className={styles.lead}>Vi har skickat en kod till {email.trim()}.</p>
      <Field label="Kod från mejlet" value={code} onChange={setCode} autoComplete="one-time-code" inputMode="numeric" />
      <Field label="Nytt lösenord" type="password" value={password} onChange={setPassword} autoComplete="new-password" hint={PASSWORD_HINT} />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? "Sparar …" : "Spara nytt lösenord"}
      </Button>
    </form>
  );
}

export function AccountSignOut() {
  ensureAmplify();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut().catch(() => {});
        window.location.assign("/");
      }}
    >
      Logga ut
    </Button>
  );
}
