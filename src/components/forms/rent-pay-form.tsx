"use client";

import { useActionState } from "react";
import {
  startRentCheckoutAction,
  type RentCheckoutResult,
} from "@/app/actions/rental";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function RentPayForm() {
  const [state, action, pending] = useActionState(
    startRentCheckoutAction,
    null as RentCheckoutResult | null,
  );
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && state.ok ? <Alert tone="info">{state.message}</Alert> : null}
      <Button type="submit" variant="accent" loading={pending}>
        How to pay this month&apos;s rent
      </Button>
    </form>
  );
}
