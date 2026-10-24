"use client";

import { useActionState } from "react";
import {
  advanceFulfillmentAction,
  type PaymentActionResult,
} from "@/app/actions/payments";
import { Button } from "@/components/ui/button";

export function FulfillmentActions({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(
    advanceFulfillmentAction,
    null as PaymentActionResult | null,
  );

  const next =
    status === "PAID"
      ? "PROCESSING"
      : status === "PROCESSING"
        ? "SHIPPED"
        : status === "SHIPPED"
          ? "DELIVERED"
          : null;

  if (!next) return null;

  const label =
    next === "PROCESSING"
      ? "Start packing"
      : next === "SHIPPED"
        ? "Mark shipped"
        : "Mark delivered";

  return (
    <form action={action} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" size="sm" variant="outline" loading={pending}>
        {label}
      </Button>
      {state && !state.ok ? (
        <span className="text-xs text-[var(--color-danger)]">{state.error}</span>
      ) : null}
      {state && state.ok ? (
        <span className="text-xs text-[var(--color-success)]">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
