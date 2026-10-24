import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "accent" | "info" | "success" | "warning" | "danger";

export function Badge({
  tone = "accent",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span className={cn("badge", `badge--${tone}`, className)} {...props} />
  );
}
