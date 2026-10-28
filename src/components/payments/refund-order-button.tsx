"use client";

import { useActionState } from "react";
import {
  refundOrderAction,
  type PaymentActionResult,
} from "@/app/actions/payments";
import { Button } from "@/components/ui/button";

export function RefundOrderButton({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(
    refundOrderAction,
    null as PaymentActionResult | null,
  );

  return (
    <form action={action} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="orderId" value={orderId} />
      <Button
        type="submit"
        size="sm"
        variant="danger"
        loading={pending}
        onClick={(e) => {
          if (!confirm("Refund this order and restore inventory?")) {
            e.preventDefault();
          }
        }}
      >
        Refund
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
