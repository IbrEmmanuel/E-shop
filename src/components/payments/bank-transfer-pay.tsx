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
}: {
  orderNumber: string;
  amountMinor: number;
  currency: string;
  accounts: SettlementAccount[];
  paymentStatus: string;
}) {
  const [selected, setSelected] = useState(accounts[0]?.id ?? "uba");
  const [copied, setCopied] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    reportTransferAction,
    null as PaymentActionResult | null,
  );

  const account = accounts.find((a) => a.id === selected) ?? accounts[0];
  const narration = transferNarration(orderNumber);
  const awaitingConfirm = paymentStatus === "REQUIRES_ACTION";
  const paid = paymentStatus === "SUCCEEDED";

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  if (paid) {
    return (
      <Alert tone="success" className="mt-6">
        Payment confirmed. Vendors will prepare your items.
      </Alert>
    );
  }

  return (
    <section className="mt-8 space-y-6">
      <div className="card overflow-hidden">
        <div className="border-b border-[var(--color-border)] px-5 py-4 md:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Pay with bank or fintech app
          </p>
          <h2 className="type-h2 mt-1 !text-2xl">
            Transfer {formatMoney(amountMinor, currency)}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--color-text-secondary)]">
            Open OPay, Moniepoint, PalmPay, Kuda, or any bank app → Transfer to
            the account below. Use your order number as the narration so we can
            match your payment instantly.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FINTECH_APPS.map((app) => (
              <span
                key={app}
                className="rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[var(--color-text-secondary)]"
              >
                {app}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 md:p-6">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a.id)}
              className={cn(
                "rounded-[var(--radius-md)] border p-4 text-left transition",
                selected === a.id
                  ? "border-[var(--color-primary)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
                  : "border-[var(--color-border)] bg-transparent hover:border-[var(--color-text-muted)]",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ background: a.accent }}
                  aria-hidden
                />
                <span className="font-semibold">{a.bank}</span>
              </div>
              <p className="mt-2 font-mono text-lg tracking-wide tabular-nums">
                {a.accountNumber}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {a.accountName}
              </p>
            </button>
          ))}
        </div>

        {account ? (
          <div className="space-y-3 border-t border-[var(--color-border)] px-5 py-5 md:px-6">
            <CopyRow
              label="Account number"
              value={account.accountNumber}
              copied={copied === "Account number"}
              onCopy={() => copy("Account number", account.accountNumber)}
            />
            <CopyRow
              label="Account name"
              value={account.accountName}
              copied={copied === "Account name"}
              onCopy={() => copy("Account name", account.accountName)}
            />
            <CopyRow
              label="Bank"
              value={account.bank}
              copied={copied === "Bank"}
              onCopy={() => copy("Bank", account.bank)}
            />
            <CopyRow
              label="Amount"
              value={formatMoney(amountMinor, currency)}
              copied={copied === "Amount"}
              onCopy={() =>
                copy("Amount", (amountMinor / 100).toFixed(2))
              }
            />
            <CopyRow
              label="Narration / remark"
              value={narration}
              copied={copied === "Narration / remark"}
              onCopy={() => copy("Narration / remark", narration)}
              emphasize
            />
          </div>
        ) : null}
      </div>

      {awaitingConfirm ? (
        <Alert tone="info">
          Payment proof submitted. An admin will approve it before packing and
          delivery. You can track the order from your account once it is
          approved.
        </Alert>
      ) : (
        <form
          action={action}
          className="card space-y-4 p-5 shadow-[var(--shadow-sm)] md:p-6"
        >
          <input type="hidden" name="orderNumber" value={orderNumber} />
          <input type="hidden" name="accountId" value={account?.id ?? "uba"} />
          <h3 className="font-semibold">Upload payment proof</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Transfer first, then upload a screenshot of the successful payment
            from OPay, Moniepoint, PalmPay, or your bank app. We approve before
            delivery starts.
          </p>
          {state && !state.ok ? (
            <Alert tone="danger">{state.error}</Alert>
          ) : null}
          {state && state.ok ? (
            <Alert tone="success">{state.message}</Alert>
          ) : null}
          <div>
            <Label htmlFor="paidVia">Paid with</Label>
            <select
              id="paidVia"
              name="paidVia"
              className="select mt-1 w-full"
              defaultValue="OPay"
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
            <Label htmlFor="transferRef">Transfer reference</Label>
            <Input
              id="transferRef"
              name="transferRef"
              required
              minLength={3}
              placeholder="e.g. session ID or bank reference"
            />
          </div>
          <div>
            <Label htmlFor="proof">Receipt screenshot</Label>
            <input
              id="proof"
              name="proof"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
              className="input mt-1 block w-full text-sm file:mr-3 file:rounded-[var(--radius-md)] file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--color-primary-foreground)]"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              JPEG, PNG, or WebP · max 5&nbsp;MB
            </p>
          </div>
          <Button type="submit" variant="primary" loading={pending}>
            Submit proof for approval
          </Button>
        </form>
      )}
    </section>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
  copied,
  emphasize,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {label}
        </p>
        <p
          className={cn(
            "truncate font-medium",
            emphasize && "font-mono text-[var(--color-primary)]",
          )}
        >
          {value}
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onCopy}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
