"use client";

import { useActionState } from "react";
import {
  submitApplicationAction,
  type ActionResult,
} from "@/app/actions/vendor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";

type Plan = {
  id: string;
  name: string;
  monthlyPriceMinor: number;
  currency: string;
};

export function VendorApplyForm({
  plans,
  defaultPlanId,
  defaultEmail,
}: {
  plans: Plan[];
  defaultPlanId?: string;
  defaultEmail?: string;
}) {
  const [state, action, pending] = useActionState(
    submitApplicationAction,
    null as ActionResult | null,
  );

  return (
    <form action={action} className="card space-y-4 p-6 shadow-[var(--shadow-md)]">
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <div>
        <Label htmlFor="storeName">Store name</Label>
        <Input id="storeName" name="storeName" required />
      </div>
      <div>
        <Label htmlFor="businessName">Business name (optional)</Label>
        <Input id="businessName" name="businessName" />
      </div>
      <div>
        <Label htmlFor="description">About your shop</Label>
        <Textarea id="description" name="description" />
      </div>
      <div>
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          required
          defaultValue={defaultEmail}
        />
      </div>
      <div>
        <Label htmlFor="contactPhone">Phone (optional)</Label>
        <Input id="contactPhone" name="contactPhone" />
      </div>
      <div>
        <Label htmlFor="website">Website (optional)</Label>
        <Input id="website" name="website" type="url" placeholder="https://" />
      </div>
      <div>
        <Label htmlFor="rentalPlanId">Monthly rental plan</Label>
        <Select
          id="rentalPlanId"
          name="rentalPlanId"
          required
          defaultValue={defaultPlanId || plans[0]?.id || ""}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatMoney(p.monthlyPriceMinor, p.currency)}/mo
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" loading={pending} className="w-full" variant="accent">
        Submit application
      </Button>
    </form>
  );
}
