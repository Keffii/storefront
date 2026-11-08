import { defineBackend } from "@aws-amplify/backend";
import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { AllowedMethods, Distribution, ViewerProtocolPolicy, CachePolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { BlockPublicAccess, Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
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

// Order emails. Limited to sending from identities verified in this account.
computeRole.addToPolicy(
  new PolicyStatement({
    actions: ["ses:SendEmail"],
    resources: [`arn:aws:ses:${Stack.of(table).region}:${Stack.of(table).account}:identity/*`],
  }),
);

/**
 * Product images uploaded from the admin. The bucket is private; images are
 * served through CloudFront with origin access control and long caching
 * (every upload gets a new key, so files never change in place).
 */
const imageBucket = new Bucket(stack, "ProductImages", {
  blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
  encryption: BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});

const imageCdn = new Distribution(stack, "ProductImagesCdn", {
  comment: "Objekt storefront product images",
  defaultBehavior: {
    origin: S3BucketOrigin.withOriginAccessControl(imageBucket),
    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
    cachePolicy: new CachePolicy(stack, "ProductImagesCache", {
      defaultTtl: Duration.days(365),
      maxTtl: Duration.days(365),
      minTtl: Duration.days(1),
    }),
  },
});

// The admin's server actions upload and remove images.
imageBucket.grantPut(computeRole, "products/*");
imageBucket.grantDelete(computeRole, "products/*");

backend.addOutput({
  custom: {
    tableName: table.tableName,
    region: Stack.of(table).region,
    computeRoleArn: computeRole.roleArn,
    imageBucket: imageBucket.bucketName,
    imageCdnDomain: imageCdn.distributionDomainName,
  },
});
