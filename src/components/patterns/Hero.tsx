import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./Hero.module.css";

interface HeroProps {
  eyebrow?: string;
  title: string;
  body?: string;
  image: { src: string; alt: string };
  actions?: ReactNode;
}

/** Full-width dark scene with a centred headline, as in the design reference. */
export function Hero({ eyebrow, title, body, image, actions }: HeroProps) {
  return (
    <section className={styles.hero}>
      {/* Served as is: the banner is a 22 kB WebP, and on phones it shows a slice several
          screens wide, so a "100vw" size would load a small version and blur the lamp. */}
      <Image src={image.src} alt={image.alt} fill priority unoptimized className={styles.image} />
      <div className={styles.scrim} aria-hidden="true" />
      <div className={`container ${styles.content}`}>
        {eyebrow && <p className={`caption ${styles.eyebrow}`}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {body && <p className={styles.body}>{body}</p>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </section>
  );
}
