"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./AccountLink.module.css";

/**
 * "Logga in" or "Mitt konto" in the header. Checks only whether Amplify's
 * sign-in cookie is present, so shop pages load no auth code. The account
 * pages themselves verify the session on the server.
 */
export function AccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    setSignedIn(/(?:^|;\s*)CognitoIdentityServiceProvider\.[^=]+\.LastAuthUser=/.test(document.cookie));
  }, []);

  return (
    <Link
      href={signedIn ? "/konto/ordrar" : "/konto/logga-in"}
      className={styles.link}
      aria-label={signedIn ? "Mitt konto" : "Logga in"}
      title={signedIn ? "Mitt konto" : "Logga in"}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.4" />
        <path d="M4.5 20c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      {signedIn && <span className={styles.dot} aria-hidden="true" />}
    </Link>
  );
}
