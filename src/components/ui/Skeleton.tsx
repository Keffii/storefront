import styles from "./Skeleton.module.css";

interface SkeletonProps {
  width?: string;
  height?: string;
  /** Aspect ratio for media placeholders, e.g. "1" for square product images. */
  aspect?: string;
  className?: string;
}

/** Loading placeholder. Decorative, so hidden from assistive tech. */
export function Skeleton({ width = "100%", height = "1em", aspect, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.skeleton} ${className ?? ""}`}
      style={{ width, height: aspect ? "auto" : height, aspectRatio: aspect }}
    />
  );
}
