import Image from "next/image";
import type { ReactNode } from "react";
import type { ProductImage } from "@/lib/types";
import styles from "./SplitPanel.module.css";

interface SplitPanelProps {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  image: ProductImage;
  /** "accent" is the one Tokyo Blue field on a page; use it once. */
  tone?: "accent" | "cream";
  imageSide?: "left" | "right";
}

export function SplitPanel({ eyebrow, title, children, image, tone = "cream", imageSide = "right" }: SplitPanelProps) {
  return (
    <section className={`${styles.panel} ${styles[tone]} ${imageSide === "left" ? styles.imageLeft : ""}`}>
      <div className={styles.text}>
        {eyebrow && <p className={`caption ${styles.eyebrow}`}>{eyebrow}</p>}
        <h2 className={styles.title}>{title}</h2>
        {children && <div className={styles.body}>{children}</div>}
      </div>
      <div className={styles.media}>
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(min-width: 960px) 50vw, 100vw"
          className={styles.image}
        />
      </div>
    </section>
  );
}
