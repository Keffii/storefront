import { defineFunction } from "@aws-amplify/backend";

/**
 * Hourly: emails one reminder to signed-in customers who left items in the
 * cart and want reminders. The table name is added in backend.ts. Values
 * from the Amplify build environment are passed through at deploy time.
 */
export const cartReminder = defineFunction({
  name: "cart-reminder",
  entry: "./handler.ts",
  schedule: "every 1h",
  timeoutSeconds: 60,
  memoryMB: 256,
  environment: {
    EMAIL_FROM: process.env.EMAIL_FROM ?? "",
    SITE_URL: process.env.SITE_URL ?? "",
    RECEIPT_SECRET: process.env.RECEIPT_SECRET ?? "",
  },
});
