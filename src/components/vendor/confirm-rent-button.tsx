"use client";

import { useActionState } from "react";
import {
  adminConfirmRentPaymentAction,
  type ConfirmRentResult,
} from "@/app/actions/rental";
import { Button } from "@/components/ui/button";

export function ConfirmRentButton({ paymentId }: { paymentId: string }) {
  const [state, action, pending] = useActionState(
    adminConfirmRentPaymentAction,
    null as ConfirmRentResult | null,
  );

  return (
    <form action={action} className="inline">
      <input type="hidden" name="paymentId" value={paymentId} />
      <Button type="submit" size="sm" variant="outline" loading={pending}>
        {state?.ok ? "Confirmed" : "Mark paid"}
      </Button>
      {state && !state.ok ? (
        <span className="ml-2 text-xs text-[var(--color-danger)]">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
