import { defineAuth } from "@aws-amplify/backend";

/**
 * Cognito user pool for the admin area. Only members of the "admin" group
 * can open /admin. Customers sign up themselves (see backend.ts); admins are
 * invited and added to the group by hand.
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: "Din verifieringskod hos Objekt",
      // The code stands alone on its own line, with no punctuation after it.
      verificationEmailBody: (createCode) =>
        `<p>Hej!</p><p>Din verifieringskod:</p><p style="font-family:monospace;font-size:20px;letter-spacing:2px;">${createCode()}</p><p>Koden gäller i 24 timmar.</p>`,
    },
  },
  groups: ["admin"],
});
