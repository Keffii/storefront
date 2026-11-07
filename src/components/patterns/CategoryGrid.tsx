import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/types";
import styles from "./CategoryGrid.module.css";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <ul role="list" className={styles.grid}>
      {categories.map((c) => (
        <li key={c.id}>
          <Link href={`/kollektion?kategori=${c.id}`} className={styles.tile}>
            <div className={styles.media}>
              <Image
                src={c.image.src}
                alt=""
                width={c.image.width}
                height={c.image.height}
                sizes="(min-width: 960px) 25vw, 50vw"
                className={styles.image}
              />
            </div>
            <div className={styles.text}>
              <span className={styles.name}>{c.name}</span>
              <span className={styles.desc}>{c.description}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
