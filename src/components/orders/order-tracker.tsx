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
    <section className="card space-y-5 p-5 shadow-[var(--shadow-sm)] md:p-6">
      <div>
        <h2
          className="text-xl"
        >
          Track delivery
        </h2>
        {locationHint ? (
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Heading to {locationHint}
          </p>
        ) : null}
        {etaLabel ? (
          <p className="mt-2 text-sm font-semibold text-[var(--color-primary)]">
            {etaLabel}
          </p>
        ) : null}
      </div>

      <ol className="space-y-0">
        {steps.map((step, i) => (
          <li key={step.key} className="flex gap-3">
            <div className="flex w-6 flex-col items-center">
              <span
                className={cn(
                  "mt-1 size-3 rounded-full border-2",
                  step.done
                    ? "border-[var(--color-success)] bg-[var(--color-success)]"
                    : step.active
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)]",
                )}
              />
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "min-h-10 w-0.5 flex-1",
                    step.done
                      ? "bg-[var(--color-success)]"
                      : "bg-[var(--color-border)]",
                  )}
                />
              ) : null}
            </div>
            <div className="pb-6">
              <p className="font-semibold">{step.label}</p>
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
              {step.note ? (
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
