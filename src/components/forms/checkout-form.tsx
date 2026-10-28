"use client";

import { useActionState, useMemo, useState } from "react";
import { placeOrderAction, type CheckoutResult } from "@/app/actions/checkout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { PAYMENT_METHODS } from "@/lib/payments/methods";
import { NG_STATES, quoteDelivery } from "@/lib/shipping";
import { cn } from "@/lib/utils";

export type CheckoutAddress = {
  id: string;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  country: string;
};

export function CheckoutForm({
  defaultEmail,
  defaultName,
  subtotalMinor,
  currency = "NGN",
  addresses = [],
  hostedCheckoutAvailable = false,
}: {
  defaultEmail?: string | null;
  defaultName?: string | null;
  subtotalMinor: number;
  currency?: string;
  addresses?: CheckoutAddress[];
  hostedCheckoutAvailable?: boolean;
}) {
  const [state, action, pending] = useActionState(
    placeOrderAction,
    null as CheckoutResult | null,
  );
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const preferred = addresses[0];
  const [shippingName, setShippingName] = useState(
    preferred?.fullName || defaultName || "",
  );
  const [line1, setLine1] = useState(preferred?.line1 || "");
  const [line2, setLine2] = useState(preferred?.line2 || "");
  const [city, setCity] = useState(preferred?.city || "");
  const [stateName, setStateName] = useState(preferred?.state || "");
  const [postal, setPostal] = useState(preferred?.postalCode || "");
  const [phone, setPhone] = useState(preferred?.phone || "");
  const [country, setCountry] = useState(preferred?.country || "NG");
  const [paymentMethod, setPaymentMethod] = useState("uba");
  const [confirmSummary, setConfirmSummary] = useState(false);

  const quote = quoteDelivery({
    city,
    state: stateName,
    country,
  });
  const totalMinor = subtotalMinor + quote.shippingMinor;

  function applyAddress(id: string) {
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setShippingName(a.fullName);
    setLine1(a.line1);
    setLine2(a.line2 || "");
    setCity(a.city);
    setStateName(a.state || "");
    setPostal(a.postalCode || "");
    setPhone(a.phone || "");
    setCountry(a.country || "NG");
  }

  return (
    <form action={action} className="checkout-form space-y-5">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
      {confirmSummary ? (
        <input type="hidden" name="confirmSummary" value="yes" />
      ) : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}

      {addresses.length > 0 ? (
        <div>
          <Label htmlFor="savedAddress">Saved address</Label>
          <select
            id="savedAddress"
            className="select mt-0 w-full"
            defaultValue={preferred?.id}
            onChange={(e) => applyAddress(e.target.value)}
          >
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName} — {a.line1}, {a.city}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {defaultEmail ? (
        <input type="hidden" name="guestEmail" value={defaultEmail} />
      ) : null}
      <div>
        <Label htmlFor="shippingName">Full name</Label>
        <Input
          id="shippingName"
          name="shippingName"
          required
          value={shippingName}
          onChange={(e) => setShippingName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="shippingLine1">Street address</Label>
        <Input
          id="shippingLine1"
          name="shippingLine1"
          required
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="shippingLine2">Apartment / landmark (optional)</Label>
        <Input
          id="shippingLine2"
          name="shippingLine2"
          value={line2}
          onChange={(e) => setLine2(e.target.value)}
        />
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
          <Input
            id="shippingPostal"
            name="shippingPostal"
            value={postal}
            onChange={(e) => setPostal(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="shippingCountry">Country</Label>
          <Input
            id="shippingCountry"
            name="shippingCountry"
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="shippingPhone">Phone</Label>
        <Input
          id="shippingPhone"
          name="shippingPhone"
          inputMode="tel"
          placeholder="080…"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Payment method</legend>
        <p className="text-xs text-[var(--color-text-muted)]">
          {hostedCheckoutAvailable
            ? "You will be redirected to secure hosted checkout after confirming."
            : "Open your bank or wallet app, transfer, then we verify payment before packing."}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaymentMethod(m.id)}
              className={cn(
                "rounded-[var(--radius-md)] border px-3 py-3 text-left transition",
                paymentMethod === m.id
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  : "border-[var(--color-border)]",
              )}
            >
              <span className="block text-sm font-semibold">{m.label}</span>
              <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                {m.description}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="checkout-form__totals">
        <p className="mb-3 text-sm font-semibold">Order summary</p>
        <div className="flex justify-between gap-3 text-sm">
          <span>Subtotal</span>
          <span className="tabular-nums">
            {formatMoney(subtotalMinor, currency)}
          </span>
        </div>
        <div className="mt-2 flex justify-between gap-3 text-sm">
          <span>
            Delivery
            {quote.zone !== "pending" ? (
              <span className="text-[var(--color-text-muted)]">
                {" "}
                · {quote.etaMinDays}–{quote.etaMaxDays} days
              </span>
            ) : null}
          </span>
          <span className="tabular-nums">
            {quote.shippingMinor > 0
              ? formatMoney(quote.shippingMinor, currency)
              : "—"}
          </span>
        </div>
        <div className="mt-3 flex justify-between gap-3 border-t border-[var(--color-border)] pt-3 text-sm font-semibold">
          <span>Total</span>
          <span className="tabular-nums">
            {formatMoney(totalMinor, currency)}
          </span>
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmSummary}
            onChange={(e) => setConfirmSummary(e.target.checked)}
          />
          <span>
            I confirm this order summary, delivery address, and payment method.
          </span>
        </label>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={pending}
        disabled={quote.shippingMinor <= 0 || !confirmSummary}
      >
        {hostedCheckoutAvailable ? "Pay & place order" : "Place order & pay"}
      </Button>
    </form>
  );
}
