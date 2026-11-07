import type { OrderStatus } from "@/lib/server/orders";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Väntar på betalning",
  paid: "Betald",
  shipped: "Skickad",
  failed: "Misslyckad",
};
