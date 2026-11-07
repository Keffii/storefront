import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { backend } from "./config";

/**
 * Single-table design. Every item has pk/sk; GSI1 (gsi1pk/gsi1sk) serves the
 * admin order list; `ttl` expires rate-limit windows and old metrics.
 *
 *   ORDER#<id>        ORDER                  order (gsi1pk=ORDERS, gsi1sk=<createdAt>)
 *   PRODUCT#<slug>    REVIEW#<ts>#<id>       review
 *   PRODUCT#<slug>    SUMMARY                review count and star sum
 *   RATE#<scope>#<h>  WINDOW#<n>             rate-limit counter (ttl)
 *   METRIC#<date>     <event>#<arm>          analytics counter (ttl)
 */

let doc: DynamoDBDocumentClient | null = null;

export function db(): DynamoDBDocumentClient {
  if (!backend.tableName) throw new Error("DynamoDB table is not configured");
  doc ??= DynamoDBDocumentClient.from(new DynamoDBClient({ region: backend.region }), {
    marshallOptions: { removeUndefinedValues: true },
  });
  return doc;
}

export const table = () => backend.tableName as string;

export { BatchGetCommand, GetCommand, PutCommand, QueryCommand, TransactWriteCommand, UpdateCommand };

export function isConditionFailure(err: unknown): boolean {
  const name = (err as { name?: string })?.name;
  return name === "ConditionalCheckFailedException" || name === "TransactionCanceledException";
}
