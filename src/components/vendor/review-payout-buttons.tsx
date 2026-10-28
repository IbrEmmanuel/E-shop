"use client";

import { useActionState } from "react";
import {
  reviewPayoutAction,
  type ActionResult,
} from "@/app/actions/payouts";
import { Button } from "@/components/ui/button";

export function ReviewPayoutButtons({ payoutId }: { payoutId: string }) {
  const [state, action, pending] = useActionState(
    reviewPayoutAction,
    null as ActionResult | null,
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <form action={action}>
          <input type="hidden" name="payoutId" value={payoutId} />
          <input type="hidden" name="decision" value="APPROVED" />
          <Button type="submit" size="sm" variant="primary" loading={pending}>
            Approve
          </Button>
        </form>
        <form action={action}>
          <input type="hidden" name="payoutId" value={payoutId} />
          <input type="hidden" name="decision" value="REJECTED" />
          <Button type="submit" size="sm" variant="outline" loading={pending}>
            Reject
          </Button>
        </form>
      </div>
      {state && !state.ok ? (
        <span className="text-xs text-[var(--color-danger)]">{state.error}</span>
      ) : null}
      {state?.ok ? (
        <span className="text-xs text-[var(--color-success)]">{state.message}</span>
      ) : null}
    </div>
  );
}
