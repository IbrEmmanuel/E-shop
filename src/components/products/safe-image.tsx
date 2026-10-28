"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

function sharpenUnsplash(src: string): string {
  if (!src.includes("images.unsplash.com") && !src.includes("plus.unsplash.com")) {
    return src;
  }
  try {
    const u = new URL(src);
    if (!u.searchParams.has("w")) u.searchParams.set("w", "1200");
    if (!u.searchParams.has("q")) u.searchParams.set("q", "85");
    if (!u.searchParams.has("auto")) u.searchParams.set("auto", "format");
    return u.toString();
  } catch {
    return src;
  }
}

/** Image that falls back to a plain <img> if Next Image optimization rejects the host. */
export function SafeImage({
  src,
  alt,
  fill,
  className,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = sharpenUnsplash(src);
  const fillClass = fill ? "absolute inset-0 h-full w-full object-cover" : "";

  if (!resolved) {
    return (
      <div
        className={cn(fillClass, className, "bg-[var(--color-bg-subtle)]")}
        aria-hidden
      />
    );
  }

  if (failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={alt}
        className={cn(fillClass, className)}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      fill={fill}
      className={cn(fill && "object-cover", className)}
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      unoptimized={resolved.startsWith("http")}
    />
  );
}
