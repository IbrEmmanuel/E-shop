"use client";

import { useActionState } from "react";
import {
  cancelUnpaidOrderAction,
  confirmDeliveryAction,
  type PaymentActionResult,
} from "@/app/actions/payments";
import { Button } from "@/components/ui/button";

export function CancelUnpaidOrderButton({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(
    cancelUnpaidOrderAction,
    null as PaymentActionResult | null,
  );

  return (
    <form action={action} className="inline-flex flex-col gap-1">
      <input type="hidden" name="orderId" value={orderId} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        loading={pending}
        onClick={(e) => {
          if (!confirm("Cancel this unpaid order and release reserved stock?")) {
            e.preventDefault();
          }
        }}
      >
        Cancel order
      </Button>
      {state && !state.ok ? (
        <span className="text-xs text-[var(--color-danger)]">{state.error}</span>
      ) : null}
      {state?.ok ? (
        <span className="text-xs text-[var(--color-success)]">{state.message}</span>
      ) : null}
    </form>
  );
}

export function ConfirmDeliveryButton({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(
    confirmDeliveryAction,
    null as PaymentActionResult | null,
  );

  return (
    <form action={action} className="inline-flex flex-col gap-1">
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" size="sm" variant="primary" loading={pending}>
        Confirm delivery
      </Button>
      {state && !state.ok ? (
        <span className="text-xs text-[var(--color-danger)]">{state.error}</span>
      ) : null}
      {state?.ok ? (
        <span className="text-xs text-[var(--color-success)]">{state.message}</span>
      ) : null}
    </form>
  );
}
