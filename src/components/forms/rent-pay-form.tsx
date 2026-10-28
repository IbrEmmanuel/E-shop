"use client";

import { useActionState, useEffect } from "react";
import {
  startRentCheckoutAction,
  type RentCheckoutResult,
} from "@/app/actions/rental";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function RentPayForm({
  vendorId,
  paystackAvailable = false,
}: {
  vendorId?: string;
  paystackAvailable?: boolean;
}) {
  const [state, action, pending] = useActionState(
    startRentCheckoutAction,
    null as RentCheckoutResult | null,
  );

  useEffect(() => {
    if (state?.ok && state.authorizationUrl) {
      window.location.assign(state.authorizationUrl);
    }
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      {vendorId ? <input type="hidden" name="vendorId" value={vendorId} /> : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && state.ok ? (
        <Alert tone="info">
          {state.message}
          {state.reference ? (
            <p className="mt-2 font-mono text-xs tracking-wide">
              Ref: {state.reference}
            </p>
          ) : null}
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="accent" loading={pending}>
          Get rent transfer details
        </Button>
        {paystackAvailable ? (
          <Button
            type="submit"
            name="provider"
            value="paystack"
            variant="outline"
            loading={pending}
          >
            Pay with Paystack
          </Button>
        ) : null}
      </div>
    </form>
  );
}
