"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
  const fillClass = fill ? "absolute inset-0 h-full w-full object-cover" : "";

  if (failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={cn(fillClass, className)} />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={cn(fill && "object-cover", className)}
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      unoptimized={src.startsWith("http")}
    />
  );
}
