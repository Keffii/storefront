import { defineAuth } from "@aws-amplify/backend";

/**
 * Cognito user pool for the admin area. Only members of the "admin" group
 * can open /admin. Self sign-up is switched off in backend.ts, so accounts
 * are created by invitation only.
 */
export const auth = defineAuth({
  loginWith: { email: true },
  groups: ["admin"],
});
