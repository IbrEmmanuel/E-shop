import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type AlertTone = "info" | "success" | "warning" | "danger";

const toneStyles: Record<AlertTone, string> = {
  info: "bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info)]/20",
  success:
    "bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]/20",
  warning:
    "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]/20",
  danger:
    "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]/20",
};

export function Alert({
  tone = "info",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: AlertTone }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[var(--radius-md)] border px-4 py-3 text-sm",
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
