import "server-only";
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { backend, isDbConfigured } from "./config";

/**
 * Custom CloudWatch metrics for things Amplify's own metrics can't see, like
 * a Stripe webhook that fails. An alarm in amplify/backend.ts emails when
 * one appears. Reporting never throws: monitoring must not break the shop.
 */
export const METRIC_NAMESPACE = "Objekt/Storefront";

let client: CloudWatchClient | null = null;

export async function reportMetric(name: "WebhookErrors" | "EmailErrors", value = 1): Promise<void> {
  // Only where the shop runs on AWS (locally and in CI there's nowhere to send it).
  if (!isDbConfigured()) return;
  try {
    client ??= new CloudWatchClient({ region: backend.region });
    await client.send(
      new PutMetricDataCommand({
        Namespace: METRIC_NAMESPACE,
        MetricData: [{ MetricName: name, Value: value, Unit: "Count" }],
      }),
    );
  } catch (err) {
    console.warn("[monitoring] could not report", name, (err as Error).name);
  }
}
