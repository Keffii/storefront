import type { ReactNode } from "react";
import type { BadgeKind } from "@/lib/types";
import styles from "./Badge.module.css";

const LABELS: Record<BadgeKind, string> = {
  new: "Nyhet",
  bestseller: "Bästsäljare",
  limited: "Begränsad upplaga",
};

type Tone = "neutral" | "dark" | "success" | "warning";

interface BadgeProps {
  kind?: BadgeKind;
  tone?: Tone;
  children?: ReactNode;
}

export function Badge({ kind, tone, children }: BadgeProps) {
  const resolved: Tone = tone ?? (kind === "new" ? "dark" : "neutral");
  return <span className={`caption ${styles.badge} ${styles[resolved]}`}>{children ?? (kind && LABELS[kind])}</span>;
}
