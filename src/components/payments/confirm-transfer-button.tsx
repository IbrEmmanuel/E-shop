"use client";

import { useActionState } from "react";
import {
  confirmTransferAction,
  type PaymentActionResult,
} from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConfirmTransferButton({
  orderId,
  expectedAmountLabel,
  reportedRef,
}: {
  orderId: string;
  expectedAmountLabel?: string;
  reportedRef?: string;
}) {
  const [state, action, pending] = useActionState(
    confirmTransferAction,
    null as PaymentActionResult | null,
  );

  return (
    <form action={action} className="inline-flex max-w-xs flex-col items-end gap-1.5">
      <input type="hidden" name="orderId" value={orderId} />
      {expectedAmountLabel ? (
        <p className="text-xs text-[var(--color-text-muted)]">
          Expected {expectedAmountLabel}
        </p>
      ) : null}
      <Input
        name="verifiedAmount"
        placeholder="Amount on statement"
        required
        className="h-8 text-sm"
        defaultValue=""
        inputMode="decimal"
      />
      <Input
        name="verifiedTransferRef"
        placeholder="Transfer reference"
        required
        className="h-8 text-sm"
        defaultValue={reportedRef ?? ""}
      />
      <Button type="submit" size="sm" variant="primary" loading={pending}>
        Approve payment
      </Button>
      {state && !state.ok ? (
        <span className="text-left text-xs text-[var(--color-danger)]">
          {state.error}
        </span>
      ) : null}
      {state && state.ok ? (
        <span className="text-xs text-[var(--color-success)]">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
