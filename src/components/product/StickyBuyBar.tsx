"use client";

import Image from "next/image";
import { useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import type { Money, ProductImage } from "@/lib/types";
import styles from "./StickyBuyBar.module.css";

interface StickyBuyBarProps {
  target: RefObject<HTMLElement | null>;
  image: ProductImage;
  title: string;
  price: Money;
  soldOut: boolean;
  onAdd: () => void;
}

/**
 * Slides up from the bottom once the main buy button has scrolled out of
 * view above the viewport, so the buy action is always one tap away.
 */
export function StickyBuyBar({ target, image, title, price, soldOut, onAdd }: StickyBuyBarProps) {
  const [visible, setVisible] = useState(false);

  // A rAF-throttled scroll check rather than an IntersectionObserver: a jump
  // or fast fling from below the button to above it never "intersects", so
  // an observer would miss it.
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = target.current;
      if (el) setVisible(el.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [target]);

  return (
    <div className={`${styles.bar} ${visible ? styles.visible : ""}`} aria-hidden={!visible} inert={!visible}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.thumb}>
          <Image src={image.src} alt="" width={48} height={48} sizes="48px" />
        </div>
        <div className={styles.text}>
          <span className={styles.title}>{title}</span>
          <Price amount={price} size="sm" />
        </div>
        <Button onClick={onAdd} disabled={soldOut} className={styles.button}>
          {soldOut ? "Slutsåld" : "Lägg i varukorgen"}
        </Button>
      </div>
    </div>
  );
}
