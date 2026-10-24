"use client";

import { useActionState } from "react";
import {
  advanceVendorOrderAction,
  type ActionResult,
} from "@/app/actions/vendor";
import { Button } from "@/components/ui/button";
import { nextVendorOrderAction } from "@/lib/vendor-order-status";

export function VendorOrderActions({
  vendorOrderId,
  status,
}: {
  vendorOrderId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(
    advanceVendorOrderAction,
    null as ActionResult | null,
  );

  const next = nextVendorOrderAction(status);
  if (!next) return null;

  return (
    <form action={action} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="vendorOrderId" value={vendorOrderId} />
      <input type="hidden" name="status" value={next.next} />
      <Button type="submit" size="sm" variant="primary" loading={pending}>
        {next.label}
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
