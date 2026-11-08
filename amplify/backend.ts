import { defineBackend } from "@aws-amplify/backend";
import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { AllowedMethods, Distribution, ViewerProtocolPolicy, CachePolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Alarm, ComparisonOperator, Metric, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { BlockPublicAccess, Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { auth } from "./auth/resource";

const backend = defineBackend({ auth });

// Customers sign up themselves; admins are told apart only by the "admin"
// group, which is assigned by hand and checked on every admin page and action.
// The invitation puts the password alone on its own line, with nothing after
// it: a trailing full stop was easy to read as part of the password.
backend.auth.resources.cfnResources.cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: false,
  inviteMessageTemplate: {
    emailSubject: "Ditt konto hos Objekt",
    emailMessage: [
      "<p>Hej!</p>",
      "<p>Du har fått ett konto hos Objekt.</p>",
      "<p>E-post: {username}<br>Tillfälligt lösenord (allt på raden nedan, inget mer):</p>",
      '<p style="font-family:monospace;font-size:20px;letter-spacing:2px;">{####}</p>',
      "<p>Logga in och välj ett eget lösenord. Det tillfälliga gäller i 7 dagar.</p>",
    ].join(""),
  },
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

// "Mina ordrar": orders by customer (gsi2pk = CUSTOMER#<cognito sub>).
table.addGlobalSecondaryIndex({
  indexName: "gsi2",
  partitionKey: { name: "gsi2pk", type: AttributeType.STRING },
  sortKey: { name: "gsi2sk", type: AttributeType.STRING },
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

// Customers can delete their own account (the server verifies the session first).
computeRole.addToPolicy(
  new PolicyStatement({
    actions: ["cognito-idp:AdminDeleteUser", "cognito-idp:AdminGetUser"],
    resources: [backend.auth.resources.userPool.userPoolArn],
  }),
);

// The admin's server actions upload and remove images.
imageBucket.grantPut(computeRole, "products/*");
imageBucket.grantDelete(computeRole, "products/*");

/*
 * Monitoring: an email when the site returns server errors or a Stripe
 * webhook fails. Two alarms cost about 0.20 USD a month. The address must
 * confirm the SNS subscription (AWS sends a link) before mail arrives.
 */
const alerts = new Topic(stack, "StorefrontAlerts", { displayName: "Objekt storefront alerts" });
alerts.addSubscription(new EmailSubscription(process.env.ALERT_EMAIL ?? "alerts@example.com"));

computeRole.addToPolicy(
  new PolicyStatement({
    actions: ["cloudwatch:PutMetricData"],
    resources: ["*"],
    conditions: { StringEquals: { "cloudwatch:namespace": "Objekt/Storefront" } },
  }),
);

new Alarm(stack, "WebhookErrorsAlarm", {
  alarmName: "objekt-storefront-webhook-errors",
  alarmDescription: "A Stripe webhook failed. Stripe retries, but check the order in the admin.",
  metric: new Metric({ namespace: "Objekt/Storefront", metricName: "WebhookErrors", statistic: "Sum", period: Duration.minutes(5) }),
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: TreatMissingData.NOT_BREACHING,
}).addAlarmAction(new SnsAction(alerts));

// AWS_APP_ID is set by Amplify during the build; a local sandbox has no hosting to watch.
if (process.env.AWS_APP_ID) {
  new Alarm(stack, "ServerErrorsAlarm", {
    alarmName: "objekt-storefront-5xx",
    alarmDescription: "The storefront returned 5 or more server errors (5xx) in 5 minutes.",
    metric: new Metric({
      namespace: "AWS/AmplifyHosting",
      metricName: "5xxErrors",
      dimensionsMap: { App: process.env.AWS_APP_ID },
      statistic: "Sum",
      period: Duration.minutes(5),
    }),
    threshold: 5,
    evaluationPeriods: 1,
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: TreatMissingData.NOT_BREACHING,
  }).addAlarmAction(new SnsAction(alerts));
}

backend.addOutput({
  custom: {
    tableName: table.tableName,
    region: Stack.of(table).region,
    computeRoleArn: computeRole.roleArn,
    imageBucket: imageBucket.bucketName,
    imageCdnDomain: imageCdn.distributionDomainName,
  },
});
