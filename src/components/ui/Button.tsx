import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "md" | "lg";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
}

type ButtonProps = CommonProps & Omit<ComponentPropsWithoutRef<"button">, "className"> & { href?: undefined };
type LinkProps = CommonProps & Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "href"> & { href: string };

function classes({ variant = "primary", size = "md", fullWidth, className }: Omit<CommonProps, "children">) {
  return [styles.button, styles[variant], styles[size], fullWidth && styles.full, className]
    .filter(Boolean)
    .join(" ");
}

/** Renders a Next.js <Link> when given an href, otherwise a <button>. */
export function Button(props: ButtonProps | LinkProps) {
  if (props.href !== undefined) {
    const { variant, size, fullWidth, className, children, ...rest } = props;
    return (
      <Link className={classes({ variant, size, fullWidth, className })} {...rest}>
        {children}
      </Link>
    );
  }
  const { variant, size, fullWidth, className, children, type, ...rest } = props;
  return (
    <button type={type ?? "button"} className={classes({ variant, size, fullWidth, className })} {...rest}>
      {children}
    </button>
  );
}
