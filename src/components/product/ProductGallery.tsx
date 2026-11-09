"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductImage } from "@/lib/types";
import styles from "./ProductGallery.module.css";

/**
 * Swipeable gallery: a CSS scroll-snap track (native touch swiping, no
 * library), arrow buttons, arrow keys, thumbnails and a zoom view.
 */
export function ProductGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const track = useRef<HTMLDivElement>(null);
  const zoomDialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  const goTo = useCallback((i: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(i, el.children.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: smooth ? "smooth" : "instant" });
    setIndex(clamped);
  }, []);

  // A new variant brings new images: start from the first.
  const firstSrc = images[0]?.src;
  useEffect(() => {
    goTo(0, false);
  }, [firstSrc, goTo]);

  function onScroll() {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    }
  }

  function openZoom() {
    setZoomed(false);
    zoomDialog.current?.showModal();
  }

  function onZoomPointer(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  const current = images[index] ?? images[0];

  return (
    <div className={styles.gallery}>
      <div className={styles.stage}>
        <div
          ref={track}
          className={styles.track}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="region"
          aria-roledescription="bildspel"
          aria-label={`Bilder på ${productName}. Använd piltangenterna för att bläddra.`}
        >
          {images.map((img, i) => (
            <div
              key={img.src}
              className={styles.slide}
              role="group"
              aria-roledescription="bild"
              aria-label={`${i + 1} av ${images.length}`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                width={img.width}
                height={img.height}
                priority={i === 0}
                // The other slides are off screen; don't let them compete with the first photo.
                fetchPriority={i === 0 ? undefined : "low"}
                sizes="(min-width: 960px) 58vw, 100vw"
                className={styles.image}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              className={`${styles.arrow} ${styles.prev}`}
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Föregående bild"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.next}`}
              onClick={() => goTo(index + 1)}
              disabled={index === images.length - 1}
              aria-label="Nästa bild"
            >
              <Chevron dir="right" />
            </button>
            <p className={`caption ${styles.counter}`} aria-hidden="true">
              {index + 1} / {images.length}
            </p>
          </>
        )}

        <button type="button" className={styles.zoomButton} onClick={openZoom} aria-label="Förstora bilden">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {images.length > 1 && (
        <ul role="list" className={styles.thumbs}>
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                className={styles.thumb}
                aria-current={i === index ? "true" : undefined}
                aria-label={`Visa bild ${i + 1}: ${img.alt}`}
                onClick={() => goTo(i)}
              >
                <Image src={img.src} alt="" width={120} height={120} sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={zoomDialog}
        className={styles.zoom}
        aria-label={`Förstorad bild: ${current?.alt ?? productName}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <button type="button" className={styles.zoomClose} onClick={() => zoomDialog.current?.close()} aria-label="Stäng">
          <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        {current && (
          <button
            type="button"
            className={`${styles.zoomStage} ${zoomed ? styles.isZoomed : ""}`}
            onClick={(e) => {
              onZoomPointer(e);
              setZoomed((z) => !z);
            }}
            onPointerMove={zoomed ? onZoomPointer : undefined}
            aria-label={zoomed ? "Zooma ut" : "Zooma in"}
          >
            <Image
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              sizes="100vw"
              className={styles.zoomImage}
              style={{ transformOrigin: origin }}
            />
          </button>
        )}
        {images.length > 1 && (
          <div className={styles.zoomNav}>
            <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Föregående bild">
              <Chevron dir="left" />
            </button>
            <span className="caption">
              {index + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={index === images.length - 1}
              aria-label="Nästa bild"
            >
              <Chevron dir="right" />
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
