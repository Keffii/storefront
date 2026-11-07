import "server-only";
import { EVENT_NAMES, type AnalyticsEventName } from "@/lib/analytics-events";
import { db, QueryCommand, table, UpdateCommand } from "./db";

/**
 * Analytics as daily counters: one item per day holding a counter per
 * "<event>#<arm>". No event log, no personal data, cheap to read for the
 * admin funnel. Items expire after 400 days.
 */
const TTL_DAYS = 400;

export const today = (d = new Date()) => d.toISOString().slice(0, 10);

export async function incrementMetric(event: AnalyticsEventName, arm: string | null, by = 1, date = today()) {
  const field = `${event}#${arm ?? "none"}`;
  await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: { pk: `METRIC#${date}`, sk: "COUNTS" },
      UpdateExpression: "ADD #f :by SET #ttl = if_not_exists(#ttl, :ttl), #d = :date",
      ExpressionAttributeNames: { "#f": field, "#ttl": "ttl", "#d": "date" },
      ExpressionAttributeValues: {
        ":by": by,
        ":ttl": Math.floor(Date.now() / 1000) + TTL_DAYS * 86400,
        ":date": date,
      },
    }),
  );
}

export interface MetricsSummary {
  days: number;
  totals: Record<AnalyticsEventName, number>;
  byArm: Record<string, Record<AnalyticsEventName, number>>;
}

function emptyCounts(): Record<AnalyticsEventName, number> {
  return Object.fromEntries(EVENT_NAMES.map((n) => [n, 0])) as Record<AnalyticsEventName, number>;
}

/** Sums counters over the last `days` days. */
export async function readMetrics(days = 30): Promise<MetricsSummary> {
  const dates = Array.from({ length: days }, (_, i) => today(new Date(Date.now() - i * 86400_000)));
  const results = await Promise.all(
    dates.map((date) =>
      db().send(
        new QueryCommand({
          TableName: table(),
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: { ":pk": `METRIC#${date}` },
        }),
      ),
    ),
  );
  const totals = emptyCounts();
  const byArm: MetricsSummary["byArm"] = {};
  for (const res of results) {
    for (const item of res.Items ?? []) {
      for (const [field, value] of Object.entries(item)) {
        const [event, arm] = field.split("#");
        if (!EVENT_NAMES.includes(event as AnalyticsEventName) || typeof value !== "number") continue;
        const name = event as AnalyticsEventName;
        totals[name] += value;
        byArm[arm] ??= emptyCounts();
        byArm[arm][name] += value;
      }
    }
  }
  return { days, totals, byArm };
}
