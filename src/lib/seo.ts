import type { Metadata } from "next";
import { siteUrl } from "@/lib/env";

export type BuildMetadataInput = {
  title: string;
  description?: string | null;
  path?: string;
  image?: string | null;
  noIndex?: boolean;
  type?: "website" | "article" | "product";
};

/**
 * Build Next.js Metadata with absolute URLs and sensible defaults.
 */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const title = input.title;
  const description =
    input.description?.trim() ||
    "E-Shop — curated multi-vendor marketplace. Shop independent makers or rent a stall monthly.";
  const url = siteUrl(input.path ?? "");
  const image = input.image
    ? input.image.startsWith("http")
      ? input.image
      : siteUrl(input.image)
    : undefined;

  // Use absolute titles so the root "%s · E-Shop" template is not applied twice
  // when callers already include the brand (or when OG needs a clean string).
  return {
    title: {
      absolute: title.includes("· E-Shop") ? title : `${title} · E-Shop`,
    },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "E-Shop",
      type: input.type === "article" ? "article" : "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

/**
 * Safe JSON-LD stringify for embedding in <script type="application/ld+json">.
 * Escapes `<` to prevent breaking out of the script tag.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function jsonLd(data: unknown): {
  __html: string;
} {
  return { __html: jsonLdScript(data) };
}
