import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "header";
  className?: string;
  priority?: boolean;
};

/** Site wordmark — light/dark assets, quiet hover only. */
export function BrandLogo({
  href = "/",
  size = "md",
  className,
  priority = false,
}: BrandLogoProps) {
  const mark = (
    <span className={cn("brand-logo", `brand-logo--${size}`)}>
      <Image
        src="/brand/e-shop-wordmark.png"
        alt="E-shop"
        fill
        priority={priority}
        className="brand-logo__img brand-logo__img--light"
        sizes="(min-width: 768px) 220px, 140px"
      />
      <Image
        src="/brand/e-shop-wordmark-dark.png"
        alt=""
        fill
        aria-hidden
        priority={priority}
        className="brand-logo__img brand-logo__img--dark"
        sizes="(min-width: 768px) 220px, 140px"
      />
    </span>
  );

  if (href === null) {
    return <span className={cn("brand-logo-link", className)}>{mark}</span>;
  }

  return (
    <Link
      href={href}
      className={cn("brand-logo-link", className)}
      aria-label="E-shop home"
    >
      {mark}
    </Link>
  );
}
