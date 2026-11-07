import { defineBackend } from "@aws-amplify/backend";
import { RemovalPolicy, Stack } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";

const backend = defineBackend({ auth });

// Invitation only: nobody can create an account from the sign-in page.
backend.auth.resources.cfnResources.cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
};

const stack = backend.createStack("storefront-data");

/**
 * One on-demand table for everything (orders, reviews, rate limits,
 * analytics counters). See src/lib/server/db.ts for the key design.
 * On-demand billing means an idle demo costs nothing.
 */
const table = new Table(stack, "StorefrontTable", {
  partitionKey: { name: "pk", type: AttributeType.STRING },
  sortKey: { name: "sk", type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: "ttl",
  // Demo data: deleting the branch deletes the table.
  removalPolicy: RemovalPolicy.DESTROY,
});

table.addGlobalSecondaryIndex({
  indexName: "gsi1",
  partitionKey: { name: "gsi1pk", type: AttributeType.STRING },
  sortKey: { name: "gsi1sk", type: AttributeType.STRING },
});

/**
 * IAM role for Amplify Hosting's server-side rendering compute. The Next.js
 * server (API routes, server components) runs with these credentials and
 * may only read and write this table. Attached to the Amplify app as its
 * compute role (see README, "Deploy").
 */
const computeRole = new Role(stack, "SsrComputeRole", {
  assumedBy: new ServicePrincipal("amplify.amazonaws.com"),
  description: "Objekt storefront: Next.js SSR access to the storefront table",
});
table.grantReadWriteData(computeRole);

backend.addOutput({
  custom: {
    tableName: table.tableName,
    region: Stack.of(table).region,
    computeRoleArn: computeRole.roleArn,
  },
});
