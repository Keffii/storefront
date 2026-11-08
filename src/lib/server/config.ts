import "server-only";
import outputs from "../../../amplify_outputs.json";

/**
 * Backend settings from amplify_outputs.json (written by the Amplify build)
 * plus secrets from environment variables. Every AWS-backed feature checks
 * these and degrades gracefully when they're missing, so the site also runs
 * locally without an AWS account or Stripe keys.
 */
interface Outputs {
  version: string;
  custom?: { tableName?: string; region?: string; imageBucket?: string; imageCdnDomain?: string };
  auth?: { aws_region: string; user_pool_id: string; user_pool_client_id: string };
}

const o = outputs as Outputs;

export const backend = {
  tableName: process.env.STOREFRONT_TABLE ?? o.custom?.tableName ?? null,
  region: process.env.STOREFRONT_REGION ?? o.custom?.region ?? o.auth?.aws_region ?? "eu-north-1",
  imageBucket: o.custom?.imageBucket ?? null,
  imageCdnDomain: o.custom?.imageCdnDomain ?? null,
};

export const isImageStorageConfigured = () => Boolean(backend.imageBucket && backend.imageCdnDomain);

export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY ?? null,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? null,
};

/** Salt for hashing IP addresses in rate limits. Not a secret worth rotating, but kept out of git. */
export const hashSalt = process.env.HASH_SALT ?? "objekt-local-dev";

export const isDbConfigured = () => Boolean(backend.tableName);
export const isStripeConfigured = () => Boolean(stripeConfig.secretKey);
