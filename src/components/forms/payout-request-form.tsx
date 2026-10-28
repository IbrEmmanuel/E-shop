"use client";

import { useActionState } from "react";
import {
  requestPayoutAction,
  type ActionResult,
} from "@/app/actions/payouts";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";

export function PayoutRequestForm({ maxMinor }: { maxMinor: number }) {
  const [state, action, pending] = useActionState(
    requestPayoutAction,
    null as ActionResult | null,
  );

  return (
    <form action={action} className="space-y-3">
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <p className="text-sm text-[var(--color-text-secondary)]">
        Available: {formatMoney(maxMinor, "NGN")}
      </p>
      <div>
        <Label htmlFor="amount">Amount (NGN)</Label>
        <Input
          id="amount"
          name="amount"
          required
          placeholder="e.g. 25000"
          inputMode="decimal"
        />
      </div>
      <div>
        <Label htmlFor="bankName">Bank name</Label>
        <Input id="bankName" name="bankName" required />
      </div>
      <div>
        <Label htmlFor="accountName">Account name</Label>
        <Input id="accountName" name="accountName" required />
      </div>
      <div>
        <Label htmlFor="accountNumber">Account number</Label>
        <Input id="accountNumber" name="accountNumber" required />
      </div>
      <Button
        type="submit"
        variant="primary"
        size="sm"
        loading={pending}
        disabled={maxMinor < 10000}
      >
        Submit request
      </Button>
    </form>
  );
}
