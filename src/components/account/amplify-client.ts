"use client";

import { Amplify } from "aws-amplify";
import outputs from "../../../amplify_outputs.json";

let configured = false;

/**
 * Configures Amplify in the browser. ssr: true stores the Cognito tokens in
 * cookies, so server components and API routes can verify the session.
 * Imported only by account pages, so shop pages don't load Amplify.
 */
export function ensureAmplify() {
  if (!configured) {
    Amplify.configure(outputs, { ssr: true });
    configured = true;
  }
}

export const isAuthAvailable = () => Boolean((outputs as { auth?: unknown }).auth);

/** Swedish messages for the Cognito errors customers actually hit. */
export function authErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name ?? "";
  switch (name) {
    case "NotAuthorizedException":
      return "Fel e-post eller lösenord.";
    case "UserNotFoundException":
      return "Det finns inget konto med den e-postadressen.";
    case "UsernameExistsException":
      return "Det finns redan ett konto med den e-postadressen. Logga in i stället.";
    case "CodeMismatchException":
      return "Koden stämmer inte. Kontrollera och försök igen.";
    case "ExpiredCodeException":
      return "Koden har gått ut. Be om en ny.";
    case "InvalidPasswordException":
      return "Lösenordet uppfyller inte kraven: minst 8 tecken med stor och liten bokstav, siffra och specialtecken.";
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "För många försök. Vänta en stund och försök igen.";
    case "UserAlreadyAuthenticatedException":
      return "Du är redan inloggad.";
    default:
      return "Något gick fel. Försök igen om en stund.";
  }
}
