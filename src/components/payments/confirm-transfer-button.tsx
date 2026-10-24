"use client";

import { useActionState } from "react";
import {
  confirmTransferAction,
  type PaymentActionResult,
} from "@/app/actions/payments";
import { Button } from "@/components/ui/button";

export function ConfirmTransferButton({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(
    confirmTransferAction,
    null as PaymentActionResult | null,
  );

  return (
    <form action={action} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" size="sm" variant="primary" loading={pending}>
        Approve payment
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
