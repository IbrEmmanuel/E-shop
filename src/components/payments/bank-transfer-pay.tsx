"use client";

import { useActionState, useState } from "react";
import {
  reportTransferAction,
  type PaymentActionResult,
} from "@/app/actions/payments";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openPaymentAppLinks } from "@/lib/payments/app-links";
import {
  FINTECH_APPS,
  type SettlementAccount,
  transferNarration,
} from "@/lib/payments/settlement";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function BankTransferPay({
  orderNumber,
  amountMinor,
  currency,
  accounts,
  paymentStatus,
  preferredAccountId,
  methodId = "uba",
  defaultPaidVia,
}: {
  orderNumber: string;
  amountMinor: number;
  currency: string;
  accounts: SettlementAccount[];
  paymentStatus: string;
  preferredAccountId?: string | null;
  methodId?: string;
  defaultPaidVia?: string;
}) {
  const initial =
    preferredAccountId && accounts.some((a) => a.id === preferredAccountId)
      ? preferredAccountId
      : (accounts[0]?.id ?? "uba");
  const [selected, setSelected] = useState(initial);
  const [copied, setCopied] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    reportTransferAction,
    null as PaymentActionResult | null,
  );

  const account = accounts.find((a) => a.id === selected) ?? accounts[0];
  const narration = transferNarration(orderNumber);
  const awaitingConfirm = paymentStatus === "REQUIRES_ACTION";
  const paid = paymentStatus === "SUCCEEDED";
  const appLinks = account
    ? openPaymentAppLinks({
        methodId,
        account,
        amountMinor,
        narration,
      })
    : [];

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  if (paid) {
    return (
      <Alert tone="success" className="mt-6">
        Payment received. We will pack your order next.
      </Alert>
    );
  }

  return (
    <section className="pay-sheet mt-8 space-y-8">
      <div>
        <p className="pay-sheet__kicker">Step 1 · Transfer</p>
        <h2 className="pay-sheet__amount">
          {formatMoney(amountMinor, currency)}
        </h2>
        <p className="mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
          Send exactly this amount from your bank or wallet app. Put{" "}
          <span className="font-mono text-[var(--color-text)]">{narration}</span>{" "}
          in the narration.
        </p>
      </div>

      <div>
        <p className="pay-sheet__kicker mb-2">Choose payment method</p>
        {accounts.length > 1 ? (
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Pay to settlement account"
          >
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={selected === a.id}
                onClick={() => setSelected(a.id)}
                className={cn(
                  "pay-sheet__tab",
                  selected === a.id && "pay-sheet__tab--on",
                )}
              >
                {a.bank}
              </button>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          OPay, UBA, Moniepoint, PalmPay, and other supported banks. Payment is
          confirmed only after server-side verification of your proof.
        </p>
      </div>

      {account ? (
        <div className="pay-sheet__details">
          <Detail
            label="Account number"
            value={account.accountNumber}
            mono
            copied={copied === "num"}
            onCopy={() => copy("num", account.accountNumber)}
          />
          <Detail
            label="Account name"
            value={account.accountName}
            copied={copied === "name"}
            onCopy={() => copy("name", account.accountName)}
          />
          <Detail
            label="Bank"
            value={account.bank}
            copied={copied === "bank"}
            onCopy={() => copy("bank", account.bank)}
          />
          <Detail
            label="Narration"
            value={narration}
            mono
            copied={copied === "nar"}
            onCopy={() => copy("nar", narration)}
          />
        </div>
      ) : null}

      {appLinks.length > 0 && !awaitingConfirm ? (
        <div className="flex flex-wrap gap-2">
          {appLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="button button--outline button--sm"
              target="_blank"
              rel="noreferrer"
            >
              {l.label}
            </a>
          ))}
        </div>
      ) : null}

      {awaitingConfirm ? (
        <Alert tone="info">
          Proof received. We will confirm and start packing shortly.
        </Alert>
      ) : (
        <form action={action} className="pay-sheet__proof space-y-4">
          <input type="hidden" name="orderNumber" value={orderNumber} />
          <input type="hidden" name="accountId" value={account?.id ?? "uba"} />
          <div>
            <p className="pay-sheet__kicker">Step 2 · Confirm</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              After the transfer goes through, attach the receipt so we can
              verify it.
            </p>
          </div>
          {state && !state.ok ? (
            <Alert tone="danger">{state.error}</Alert>
          ) : null}
          {state && state.ok ? (
            <Alert tone="success">{state.message}</Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="paidVia">Sent from</Label>
              <select
                id="paidVia"
                name="paidVia"
                className="select mt-1 w-full"
                defaultValue={defaultPaidVia || "OPay"}
                required
              >
                {FINTECH_APPS.map((app) => (
                  <option key={app} value={app}>
                    {app}
                  </option>
                ))}
                <option value="Other bank">Other bank</option>
              </select>
            </div>
            <div>
              <Label htmlFor="transferRef">Reference / session ID</Label>
              <Input
                id="transferRef"
                name="transferRef"
                required
                minLength={3}
                placeholder="From your receipt"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="proof">Receipt photo</Label>
            <input
              id="proof"
              name="proof"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
              className="pay-sheet__file mt-1"
            />
          </div>
          <Button type="submit" variant="primary" loading={pending}>
            I have paid
          </Button>
        </form>
      )}
    </section>
  );
}

function Detail({
  label,
  value,
  onCopy,
  copied,
  mono,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  mono?: boolean;
}) {
  return (
    <div className="pay-sheet__row">
      <div className="min-w-0">
        <p className="pay-sheet__label">{label}</p>
        <p className={cn("pay-sheet__value", mono && "font-mono tracking-wide")}>
          {value}
        </p>
      </div>
      <button type="button" className="pay-sheet__copy" onClick={onCopy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
