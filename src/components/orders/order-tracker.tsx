import { cn } from "@/lib/utils";
import type { TrackingStep } from "@/services/orders";

export function OrderTracker({
  steps,
  etaLabel,
  locationHint,
}: {
  steps: TrackingStep[];
  etaLabel: string | null;
  locationHint: string;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Delivery status</h2>
        {locationHint ? (
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {locationHint}
          </p>
        ) : null}
        {etaLabel ? (
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{etaLabel}</p>
        ) : null}
      </div>

      <ol className="space-y-0">
        {steps.map((step, i) => (
          <li key={step.key} className="flex gap-3">
            <div className="flex w-5 flex-col items-center">
              <span
                className={cn(
                  "mt-1.5 size-2.5 rounded-full",
                  step.done || step.active
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--color-border)]",
                )}
              />
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "min-h-9 w-px flex-1",
                    step.done
                      ? "bg-[var(--color-primary)]"
                      : "bg-[var(--color-border)]",
                  )}
                />
              ) : null}
            </div>
            <div className="pb-5">
              <p
                className={cn(
                  "text-sm",
                  step.active || step.done
                    ? "font-semibold text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)]",
                )}
              >
                {step.label}
              </p>
              {step.at ? (
                <p
                  className="text-xs text-[var(--color-text-muted)]"
                  suppressHydrationWarning
                >
                  {step.at.toLocaleString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}
                </p>
              ) : null}
              {step.note && (step.active || step.done) ? (
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {step.note}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
