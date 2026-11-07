"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Price } from "@/components/ui/Price";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { site } from "@/data/products";
import { track } from "@/lib/analytics";
import { MAX_QUANTITY, suggestAddOn } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { variantLabel } from "@/lib/variants";
import { useCart } from "./CartProvider";
import styles from "./CartDrawer.module.css";

type CheckoutState = { status: "idle" } | { status: "loading" } | { status: "error"; message: string };

export function CartDrawer() {
  const { cart, isOpen, close, add, setQuantity, remove } = useCart();
  const [checkout, setCheckout] = useState<CheckoutState>({ status: "idle" });
  const suggestion = suggestAddOn(cart);
  const progress = Math.min(1, (site.freeShippingThreshold - cart.freeShippingRemaining) / site.freeShippingThreshold);

  async function startCheckout() {
    setCheckout({ status: "loading" });
    track({ name: "checkout_started", value: cart.total, items: cart.itemCount });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: cart.lines.map((l) => ({ slug: l.slug, variantId: l.variantId, quantity: l.quantity })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setCheckout({ status: "error", message: data.message ?? "Kassan gick inte att öppna. Försök igen om en stund." });
    } catch {
      setCheckout({ status: "error", message: "Ingen anslutning. Kontrollera nätverket och försök igen." });
    }
  }

  const footer =
    cart.lines.length > 0 ? (
      <div className={styles.summary}>
        <dl className={styles.totals}>
          <div>
            <dt>Delsumma</dt>
            <dd>{formatPrice(cart.subtotal)}</dd>
          </div>
          {cart.discount > 0 && (
            <div className={styles.saving}>
              <dt>Paketrabatt</dt>
              <dd>−{formatPrice(cart.discount)}</dd>
            </div>
          )}
          <div>
            <dt>Frakt</dt>
            <dd>{cart.shipping === 0 ? "Fri" : formatPrice(cart.shipping)}</dd>
          </div>
          <div className={styles.total}>
            <dt>Totalt inkl. moms</dt>
            <dd>{formatPrice(cart.total)}</dd>
          </div>
        </dl>
        {checkout.status === "error" && (
          <p className={styles.error} role="alert">
            {checkout.message}
          </p>
        )}
        <Button size="lg" fullWidth onClick={startCheckout} disabled={checkout.status === "loading"}>
          {checkout.status === "loading" ? "Öppnar kassan …" : "Till kassan"}
        </Button>
        <p className={styles.payNote}>Kort eller Klarna · Testläge, inga riktiga betalningar</p>
      </div>
    ) : undefined;

  return (
    <Drawer open={isOpen} onClose={close} title={`Varukorg (${cart.itemCount})`} footer={footer}>
      {cart.lines.length === 0 ? (
        <div className={styles.empty}>
          <p>Din varukorg är tom.</p>
          <Button href="/kollektion" variant="secondary" onClick={close}>
            Se alla produkter
          </Button>
        </div>
      ) : (
        <div className={styles.content}>
          <div className={styles.shipping} aria-live="polite">
            <p>
              {cart.qualifiesForFreeShipping ? (
                <strong>Du har fri frakt!</strong>
              ) : (
                <>
                  Handla för <strong>{formatPrice(cart.freeShippingRemaining)}</strong> till för fri frakt
                </>
              )}
            </p>
            <div
              className={styles.bar}
              role="progressbar"
              aria-label="Kvar till fri frakt"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <span style={{ transform: `scaleX(${progress})` }} />
            </div>
          </div>

          <ul role="list" className={styles.lines}>
            {cart.lines.map((l) => (
              <li key={l.key} className={styles.line}>
                {/* Duplicate of the name link below, so hidden from keyboard and screen readers. */}
                <Link
                  href={`/produkter/${l.slug}?variant=${l.variantId}`}
                  className={styles.thumb}
                  onClick={close}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <Image src={l.variant.images[0].src} alt="" width={80} height={80} sizes="80px" />
                </Link>
                <div className={styles.lineBody}>
                  <div className={styles.lineTop}>
                    <Link href={`/produkter/${l.slug}?variant=${l.variantId}`} className={styles.lineName} onClick={close}>
                      {variantLabel(l.product, l.variant)}
                    </Link>
                    <Price amount={l.total} before={l.discount > 0 ? l.unitPrice * l.quantity : undefined} size="sm" />
                  </div>
                  {l.discount > 0 && <p className={styles.lineNote}>Paketpris med {l.discountedUnits} st</p>}
                  <div className={styles.lineActions}>
                    <QuantityStepper
                      size="sm"
                      value={l.quantity}
                      max={Math.min(MAX_QUANTITY, l.variant.stock)}
                      onChange={(q) => setQuantity(l.slug, l.variantId, q)}
                      label={`Antal ${l.product.name}`}
                    />
                    <button type="button" className={styles.remove} onClick={() => remove(l.slug, l.variantId)}>
                      Ta bort
                      <span className="visually-hidden"> {l.product.name}</span>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {suggestion && (
            <aside className={styles.suggestion} aria-label="Förslag">
              <p className="caption">Passar till {suggestion.parent.name}</p>
              <div className={styles.suggestionRow}>
                <div className={styles.thumb}>
                  <Image src={suggestion.variant.images[0].src} alt="" width={64} height={64} sizes="64px" />
                </div>
                <div className={styles.lineBody}>
                  <span className={styles.lineName}>{suggestion.product.name}</span>
                  <Price
                    amount={suggestion.variant.price - suggestion.offer.bundleDiscount}
                    before={suggestion.variant.price}
                    size="sm"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={() => add([{ slug: suggestion.product.slug, variantId: suggestion.variant.id, quantity: 1 }])}
                >
                  Lägg till
                </Button>
              </div>
            </aside>
          )}
        </div>
      )}
    </Drawer>
  );
}
