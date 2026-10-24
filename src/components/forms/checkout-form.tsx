"use client";

import { useActionState, useMemo, useState } from "react";
import { placeOrderAction, type CheckoutResult } from "@/app/actions/checkout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { FINTECH_APPS } from "@/lib/payments/settlement";
import { NG_STATES, quoteDelivery } from "@/lib/shipping";

export function CheckoutForm({
  defaultEmail,
  defaultName,
  subtotalMinor,
  currency = "NGN",
}: {
  defaultEmail?: string | null;
  defaultName?: string | null;
  subtotalMinor: number;
  currency?: string;
}) {
  const [state, action, pending] = useActionState(
    placeOrderAction,
    null as CheckoutResult | null,
  );
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");

  const quote = quoteDelivery({
    city,
    state: stateName,
    country: "NG",
  });
  const totalMinor = subtotalMinor + quote.shippingMinor;

  return (
    <form action={action} className="card space-y-5 p-6 shadow-[var(--shadow-md)]">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="card p-4">
        <p className="font-semibold">Pay before delivery</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Transfer from {FINTECH_APPS.slice(0, 4).join(", ")}, or any bank to
          our UBA / OPay accounts, then upload payment proof for approval before
          we ship.
        </p>
      </div>

      {!defaultEmail ? (
        <div>
          <Label htmlFor="guestEmail">Email</Label>
          <Input
            id="guestEmail"
            name="guestEmail"
            type="email"
            required
            defaultValue={defaultEmail ?? ""}
          />
        </div>
      ) : (
        <input type="hidden" name="guestEmail" value={defaultEmail} />
      )}
      <div>
        <Label htmlFor="shippingName">Full name</Label>
        <Input
          id="shippingName"
          name="shippingName"
          required
          defaultValue={defaultName ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="shippingLine1">Delivery address</Label>
        <Input id="shippingLine1" name="shippingLine1" required />
      </div>
      <div>
        <Label htmlFor="shippingLine2">Apartment, suite (optional)</Label>
        <Input id="shippingLine2" name="shippingLine2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="shippingCity">City</Label>
          <Input
            id="shippingCity"
            name="shippingCity"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="shippingState">State</Label>
          <select
            id="shippingState"
            name="shippingState"
            required
            className="select mt-0 w-full"
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
          >
            <option value="">Select state</option>
            {NG_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="shippingPostal">Postal code</Label>
          <Input id="shippingPostal" name="shippingPostal" />
        </div>
        <div>
          <Label htmlFor="shippingCountry">Country</Label>
          <Input
            id="shippingCountry"
            name="shippingCountry"
            defaultValue="NG"
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="shippingPhone">Phone</Label>
        <Input id="shippingPhone" name="shippingPhone" />
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 text-sm">
        <div className="flex justify-between gap-3">
          <span>Subtotal</span>
          <span className="tabular-nums">
            {formatMoney(subtotalMinor, currency)}
          </span>
        </div>
        <div className="mt-2 flex justify-between gap-3">
          <span>
            Delivery
            {quote.zone !== "pending" ? (
              <span className="text-[var(--color-text-muted)]">
                {" "}
                · {quote.label} · {quote.etaMinDays}–{quote.etaMaxDays} days
              </span>
            ) : null}
          </span>
          <span className="tabular-nums">
            {quote.shippingMinor > 0
              ? formatMoney(quote.shippingMinor, currency)
              : "—"}
          </span>
        </div>
        <div className="mt-3 flex justify-between gap-3 border-t border-[var(--color-border)] pt-3 font-semibold">
          <span>Total due</span>
          <span className="tabular-nums">
            {formatMoney(totalMinor, currency)}
          </span>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={pending}
        disabled={quote.shippingMinor <= 0}
      >
        Place order & pay by transfer
      </Button>
    </form>
  );
}
