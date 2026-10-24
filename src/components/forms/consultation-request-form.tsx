"use client";

import { useActionState } from "react";
import {
  requestConsultationAction,
  type ConsultationActionResult,
} from "@/app/actions/consultations";
import { CONSULTATION_PACKAGES } from "@/lib/consultation-packages";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";

export function ConsultationRequestForm({
  defaultName,
  defaultEmail,
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [state, action, pending] = useActionState(
    requestConsultationAction,
    null as ConsultationActionResult | null,
  );

  return (
    <form action={action} className="card space-y-4 p-6 shadow-[var(--shadow-md)]">
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <div>
        <Label htmlFor="packageId">Package</Label>
        <Select id="packageId" name="packageId" defaultValue="basic">
          {CONSULTATION_PACKAGES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatMoney(p.priceMinor, "NGN")}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={defaultName} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" />
        </div>
        <div>
          <Label htmlFor="preferredAt">Preferred time</Label>
          <Input id="preferredAt" name="preferredAt" type="datetime-local" />
        </div>
      </div>
      <div>
        <Label htmlFor="topic">Topic</Label>
        <Input
          id="topic"
          name="topic"
          required
          placeholder="Electrical planning, vendor onboarding…"
        />
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" required rows={5} />
      </div>
      <Button type="submit" variant="primary" loading={pending}>
        Book consultation
      </Button>
    </form>
  );
}
