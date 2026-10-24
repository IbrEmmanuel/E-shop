import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card flex flex-col items-center gap-3 px-8 py-14 text-center",
        className,
      )}
    >
      <h3 className="type-h2 !text-xl">{title}</h3>
      {description ? (
        <p className="type-body max-w-md">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
