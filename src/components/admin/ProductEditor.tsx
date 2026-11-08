"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveProductAction, uploadImageAction } from "@/app/admin/produkter/actions";
import { Button } from "@/components/ui/Button";
import { categories } from "@/data/products";
import {
  draftToProduct,
  slugify,
  syncCombinations,
  type DraftErrors,
  type EditorColor,
  type ProductDraft,
} from "@/lib/catalog-admin";
import type { BadgeKind } from "@/lib/types";
import styles from "./ProductEditor.module.css";

const BADGES: { id: BadgeKind; label: string }[] = [
  { id: "new", label: "Nyhet" },
  { id: "bestseller", label: "Bästsäljare" },
  { id: "limited", label: "Begränsad upplaga" },
];

interface Props {
  initial: ProductDraft;
  isNew: boolean;
  otherProducts: { slug: string; name: string }[];
  imageStorage: boolean;
}

export function ProductEditor({ initial, isNew, otherProducts, imageStorage }: Props) {
  const router = useRouter();
  const [d, setD] = useState<ProductDraft>(initial);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const summaryRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setD((prev) => ({ ...prev, [key]: value }));
  const withCombos = (next: ProductDraft) => ({ ...next, combinations: syncCombinations(next) });
  const allImages = d.colors.flatMap((c) => c.images);

  function save() {
    setMessage(null);
    const local = draftToProduct(d, { slugTaken: false, addOnSlugs: otherProducts.map((p) => p.slug).concat(d.slug) });
    if (!local.ok) {
      setErrors(local.errors);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    startSaving(async () => {
      const res = await saveProductAction({ ...d, combinations: syncCombinations(d) }, isNew ? null : initial.slug);
      if (res.ok) {
        setErrors({});
        setMessage({ tone: "ok", text: "Sparat. Ändringen syns i butiken inom några sekunder." });
        if (isNew) router.replace(`/admin/produkter/${res.slug}`);
        else router.refresh();
      } else {
        setErrors(res.errors);
        setMessage(res.message ? { tone: "error", text: res.message } : null);
        requestAnimationFrame(() => summaryRef.current?.focus());
      }
    });
  }

  const err = (key: string) => (errors[key] ? <span className={styles.error}>{errors[key]}</span> : null);
  const errorList = Object.values(errors);

  return (
    <form
      className={styles.editor}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
    >
      {errorList.length > 0 && (
        <div className={styles.summary} ref={summaryRef} tabIndex={-1} role="alert">
          <p>Rätta det här innan du sparar:</p>
          <ul>
            {[...new Set(errorList)].map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <section className={styles.section} aria-labelledby="sec-basic">
        <h2 id="sec-basic" className={styles.h2}>
          Grunduppgifter
        </h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span>Namn</span>
            <input
              value={d.name}
              onChange={(e) => {
                const name = e.target.value;
                setD((prev) => ({ ...prev, name, slug: slugTouched ? prev.slug : slugify(name) }));
              }}
            />
            {err("name")}
          </label>
          <label className={styles.field}>
            <span>Adress (/produkter/…)</span>
            <input
              value={d.slug}
              readOnly={!isNew}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
            />
            {!isNew && <span className={styles.hint}>Adressen kan inte ändras efter att produkten skapats.</span>}
            {err("slug")}
          </label>
        </div>
        <label className={styles.field}>
          <span>Kort beskrivning (en rad)</span>
          <input value={d.tagline} onChange={(e) => set("tagline", e.target.value)} />
          {err("tagline")}
        </label>
        <label className={styles.field}>
          <span>Beskrivning</span>
          <textarea rows={4} value={d.description} onChange={(e) => set("description", e.target.value)} />
          {err("description")}
        </label>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span>Kategori</span>
            <select value={d.category} onChange={(e) => set("category", e.target.value as ProductDraft["category"])}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className={styles.checks}>
            <legend>Märken</legend>
            {BADGES.map((b) => (
              <label key={b.id}>
                <input
                  type="checkbox"
                  checked={d.badges.includes(b.id)}
                  onChange={(e) =>
                    set("badges", e.target.checked ? [...d.badges, b.id] : d.badges.filter((x) => x !== b.id))
                  }
                />
                {b.label}
              </label>
            ))}
          </fieldset>
        </div>
        <div className={styles.checksRow}>
          <label>
            <input type="checkbox" checked={d.published} onChange={(e) => set("published", e.target.checked)} />
            Publicerad (syns i butiken)
          </label>
          <label>
            <input type="checkbox" checked={d.featured} onChange={(e) => set("featured", e.target.checked)} />
            Visas bland utvalda på startsidan
          </label>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="sec-colors">
        <h2 id="sec-colors" className={styles.h2}>
          Färger och bilder
        </h2>
        {err("colors")}
        {d.colors.map((c, i) => (
          <ColorRow
            key={i}
            color={c}
            index={i}
            slug={d.slug}
            isDefault={d.defaultColor === c.id}
            imageStorage={imageStorage}
            errors={errors}
            onChange={(next) => {
              const colors = d.colors.map((x, j) => (j === i ? next : x));
              const defaultColor = d.defaultColor === c.id ? next.id : d.defaultColor;
              setD((prev) => withCombos({ ...prev, colors, defaultColor }));
            }}
            onDefault={() => set("defaultColor", c.id)}
            onRemove={() => setD((prev) => withCombos({ ...prev, colors: prev.colors.filter((_, j) => j !== i) }))}
          />
        ))}
        <Button
          variant="secondary"
          onClick={() =>
            setD((prev) =>
              withCombos({
                ...prev,
                colors: [...prev.colors, { id: "", label: "", swatch: "#cccccc", images: [] }],
                defaultColor: prev.defaultColor || "",
              }),
            )
          }
        >
          Lägg till färg
        </Button>
        {err("defaultColor")}
      </section>

      <section className={styles.section} aria-labelledby="sec-sizes">
        <h2 id="sec-sizes" className={styles.h2}>
          Storlekar (valfritt)
        </h2>
        {d.sizes.map((s, i) => (
          <div key={i} className={styles.row}>
            <label className={styles.field}>
              <span>Storlek</span>
              <input
                value={s.label}
                placeholder="Liten · 32 cm"
                onChange={(e) => {
                  const label = e.target.value;
                  const sizes = d.sizes.map((x, j) => (j === i ? { id: slugify(label.split("·")[0]), label } : x));
                  setD((prev) => withCombos({ ...prev, sizes }));
                }}
              />
              {err(`sizes.${i}`) ?? err(`sizes.${i}.label`)}
            </label>
            <Button variant="ghost" onClick={() => setD((prev) => withCombos({ ...prev, sizes: prev.sizes.filter((_, j) => j !== i) }))}>
              Ta bort
            </Button>
          </div>
        ))}
        <Button variant="secondary" onClick={() => setD((prev) => withCombos({ ...prev, sizes: [...prev.sizes, { id: "", label: "" }] }))}>
          Lägg till storlek
        </Button>
      </section>

      <section className={styles.section} aria-labelledby="sec-prices">
        <h2 id="sec-prices" className={styles.h2}>
          Pris och startlager
        </h2>
        <p className={styles.hint}>
          Priser i kronor inklusive moms. Startlagret gäller tills varianten säljer första gången; därefter ändras lagret under
          Lager.
        </p>
        {syncCombinations(d).length === 0 ? (
          <p className={styles.hint}>Lägg till en färg först.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Variant</th>
                <th scope="col">Pris (kr)</th>
                <th scope="col">Startlager</th>
              </tr>
            </thead>
            <tbody>
              {syncCombinations(d).map((c, i) => {
                const colorName = d.colors.find((x) => x.id === c.color)?.label || c.color;
                const sizeName = d.sizes.find((x) => x.id === c.size)?.label;
                const update = (patch: Partial<typeof c>) =>
                  setD((prev) => ({
                    ...prev,
                    combinations: syncCombinations(prev).map((x) => (x.color === c.color && x.size === c.size ? { ...x, ...patch } : x)),
                  }));
                return (
                  <tr key={`${c.color}-${c.size}`}>
                    <th scope="row">{sizeName ? `${colorName}, ${sizeName}` : colorName}</th>
                    <td>
                      <input
                        type="number"
                        min={1}
                        step="1"
                        value={c.price || ""}
                        aria-label={`Pris för ${colorName}${sizeName ? `, ${sizeName}` : ""}`}
                        onChange={(e) => update({ price: Number(e.target.value) })}
                      />
                      {err(`combinations.${i}.price`)}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={c.stock}
                        aria-label={`Startlager för ${colorName}${sizeName ? `, ${sizeName}` : ""}`}
                        onChange={(e) => update({ stock: Number(e.target.value) })}
                      />
                      {err(`combinations.${i}.stock`)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.section} aria-labelledby="sec-features">
        <h2 id="sec-features" className={styles.h2}>
          Funktioner
        </h2>
        {d.features.map((f, i) => (
          <div key={i} className={styles.card}>
            <label className={styles.field}>
              <span>Rubrik</span>
              <input value={f.title} onChange={(e) => set("features", d.features.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            </label>
            <label className={styles.field}>
              <span>Text</span>
              <textarea rows={3} value={f.body} onChange={(e) => set("features", d.features.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
            </label>
            <label className={styles.field}>
              <span>Bild</span>
              <select
                value={f.imageSrc ?? ""}
                onChange={(e) => set("features", d.features.map((x, j) => (j === i ? { ...x, imageSrc: e.target.value || undefined } : x)))}
              >
                <option value="">Ingen bild</option>
                {allImages.map((img) => (
                  <option key={img.src} value={img.src}>
                    {img.alt || img.src.split("/").pop()}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="ghost" onClick={() => set("features", d.features.filter((_, j) => j !== i))}>
              Ta bort funktion
            </Button>
          </div>
        ))}
        <Button variant="secondary" onClick={() => set("features", [...d.features, { id: "", title: "", body: "" }])}>
          Lägg till funktion
        </Button>
      </section>

      <section className={styles.section} aria-labelledby="sec-specs">
        <h2 id="sec-specs" className={styles.h2}>
          Specifikationer
        </h2>
        {d.specs.map((s, i) => (
          <div key={i} className={styles.row}>
            <label className={styles.field}>
              <span>Egenskap</span>
              <input value={s.label} onChange={(e) => set("specs", d.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            </label>
            <label className={styles.field}>
              <span>Värde</span>
              <input value={s.value} onChange={(e) => set("specs", d.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
            </label>
            <Button variant="ghost" onClick={() => set("specs", d.specs.filter((_, j) => j !== i))}>
              Ta bort
            </Button>
          </div>
        ))}
        <Button variant="secondary" onClick={() => set("specs", [...d.specs, { label: "", value: "" }])}>
          Lägg till rad
        </Button>
        <label className={styles.field}>
          <span>Vad ingår (en sak per rad)</span>
          <textarea rows={3} value={d.inTheBox.join("\n")} onChange={(e) => set("inTheBox", e.target.value.split("\n"))} />
        </label>
      </section>

      <section className={styles.section} aria-labelledby="sec-faq">
        <h2 id="sec-faq" className={styles.h2}>
          Vanliga frågor
        </h2>
        {d.faq.map((f, i) => (
          <div key={i} className={styles.card}>
            <label className={styles.field}>
              <span>Fråga</span>
              <input value={f.question} onChange={(e) => set("faq", d.faq.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
            </label>
            <label className={styles.field}>
              <span>Svar</span>
              <textarea rows={2} value={f.answer} onChange={(e) => set("faq", d.faq.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
            </label>
            <Button variant="ghost" onClick={() => set("faq", d.faq.filter((_, j) => j !== i))}>
              Ta bort fråga
            </Button>
          </div>
        ))}
        <Button variant="secondary" onClick={() => set("faq", [...d.faq, { question: "", answer: "" }])}>
          Lägg till fråga
        </Button>
      </section>

      <section className={styles.section} aria-labelledby="sec-addons">
        <h2 id="sec-addons" className={styles.h2}>
          Köp till och spara
        </h2>
        {d.addOns.map((a, i) => (
          <div key={i} className={styles.row}>
            <label className={styles.field}>
              <span>Tillbehör</span>
              <select value={a.slug} onChange={(e) => set("addOns", d.addOns.map((x, j) => (j === i ? { ...x, slug: e.target.value } : x)))}>
                <option value="">Välj produkt</option>
                {otherProducts
                  .filter((p) => p.slug !== d.slug)
                  .map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Paketrabatt (kr)</span>
              <input
                type="number"
                min={0}
                value={a.discountKr}
                onChange={(e) => set("addOns", d.addOns.map((x, j) => (j === i ? { ...x, discountKr: Number(e.target.value) } : x)))}
              />
            </label>
            <Button variant="ghost" onClick={() => set("addOns", d.addOns.filter((_, j) => j !== i))}>
              Ta bort
            </Button>
          </div>
        ))}
        {err("addOns")}
        <Button variant="secondary" onClick={() => set("addOns", [...d.addOns, { slug: "", discountKr: 0 }])}>
          Lägg till tillbehör
        </Button>
      </section>

      <div className={styles.saveBar}>
        {message && (
          <p className={message.tone === "ok" ? styles.ok : styles.error} role="status">
            {message.text}
          </p>
        )}
        {!isNew && d.published && (
          <Link href={`/produkter/${initial.slug}`} target="_blank" className={styles.viewLink}>
            Visa i butiken
          </Link>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Sparar …" : isNew ? "Skapa produkt" : "Spara ändringar"}
        </Button>
      </div>
    </form>
  );
}

function ColorRow({
  color,
  index,
  slug,
  isDefault,
  imageStorage,
  errors,
  onChange,
  onDefault,
  onRemove,
}: {
  color: EditorColor;
  index: number;
  slug: string;
  isDefault: boolean;
  imageStorage: boolean;
  errors: DraftErrors;
  onChange: (c: EditorColor) => void;
  onDefault: () => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const err = (key: string) => (errors[key] ? <span className={styles.error}>{errors[key]}</span> : null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    setUploadError(null);
    if (!file) return setUploadError("Välj en bildfil.");
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("file", file);
    fd.set("alt", alt || `${color.label}`);
    setUploading(true);
    const res = await uploadImageAction(fd);
    setUploading(false);
    if (!res.ok) return setUploadError(res.message);
    onChange({ ...color, images: [...color.images, res.image] });
    setAlt("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const move = (from: number, to: number) => {
    const images = [...color.images];
    const [img] = images.splice(from, 1);
    images.splice(to, 0, img);
    onChange({ ...color, images });
  };

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <label className={styles.field}>
          <span>Färgnamn</span>
          <input value={color.label} onChange={(e) => onChange({ ...color, label: e.target.value, id: slugify(e.target.value) })} />
          {err(`colors.${index}`) ?? err(`colors.${index}.label`)}
        </label>
        <label className={styles.field}>
          <span>Färgprick</span>
          <input type="color" value={color.swatch} onChange={(e) => onChange({ ...color, swatch: e.target.value })} className={styles.swatchInput} />
          {err(`colors.${index}.swatch`)}
        </label>
        <label className={styles.inlineCheck}>
          <input type="radio" name="defaultColor" checked={isDefault} onChange={onDefault} />
          Visas först
        </label>
        <Button variant="ghost" onClick={onRemove}>
          Ta bort färg
        </Button>
      </div>

      <ul role="list" className={styles.images} aria-label={`Bilder för ${color.label || "färgen"}`}>
        {color.images.map((img, i) => (
          <li key={img.src} className={styles.image}>
            <Image src={img.src} alt={img.alt} width={96} height={96} sizes="96px" />
            <div className={styles.imageActions}>
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Flytta bild ${i + 1} åt vänster`}>
                ←
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === color.images.length - 1}
                aria-label={`Flytta bild ${i + 1} åt höger`}
              >
                →
              </button>
              <button type="button" onClick={() => onChange({ ...color, images: color.images.filter((_, j) => j !== i) })} aria-label={`Ta bort bild ${i + 1}`}>
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
      {err(`colors.${index}.images`)}

      {imageStorage ? (
        <div className={styles.upload}>
          <label className={styles.field}>
            <span>Ny bild (JPG, PNG eller WebP, minst 400 × 400 px)</span>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" />
          </label>
          <label className={styles.field}>
            <span>Bildbeskrivning (alt-text)</span>
            <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder={`${color.label} framifrån`} />
          </label>
          <Button variant="secondary" onClick={upload} disabled={uploading}>
            {uploading ? "Laddar upp …" : "Ladda upp"}
          </Button>
          {uploadError && <span className={styles.error}>{uploadError}</span>}
        </div>
      ) : (
        <p className={styles.hint}>Bilduppladdning kräver bildlagringen i AWS och fungerar bara på den publicerade sajten.</p>
      )}
    </div>
  );
}
