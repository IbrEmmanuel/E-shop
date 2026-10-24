import Link from "next/link";
import { CheckoutForm } from "@/components/forms/checkout-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getSessionUser } from "@/lib/auth";
import { getGuestKey } from "@/lib/guest";
import {
  bankTransferAvailable,
  FINTECH_APPS,
  getSettlementAccounts,
} from "@/lib/payments/settlement";
import { formatMoney } from "@/lib/money";
import { buildMetadata } from "@/lib/seo";
import { getCartTotals } from "@/services/cart";

export const metadata = buildMetadata({
  title: "Checkout",
  path: "/checkout",
  noIndex: true,
});

export default async function CheckoutPage() {
  const user = await getSessionUser();
  const guestKey = user ? null : await getGuestKey();
  const bankEnabled = bankTransferAvailable();
  const accounts = getSettlementAccounts();

  if (!user && !guestKey) {
    return (
      <div className="container-page py-14">
        <EmptyState
          title="Nothing to checkout"
          action={
            <Button asChild href="/shop">
              Shop
            </Button>
          }
        />
      </div>
    );
  }

  const totals = await getCartTotals({
    userId: user?.id,
    guestKey,
  }).catch(() => null);

  if (!totals || totals.lines.length === 0) {
    return (
      <div className="container-page py-14">
        <EmptyState
          title="Your cart is empty"
          action={
            <Button asChild href="/cart">
              View cart
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="type-h1">Checkout</h1>
      <p className="type-body mt-2 max-w-2xl">
        Pay with {FINTECH_APPS.slice(0, 5).join(", ")}, and other Nigerian banks
        — transfer to our UBA or OPay account after you place the order.
      </p>
      {bankEnabled ? (
        <Alert tone="info" className="mt-4 max-w-2xl">
          Settlement accounts ready:{" "}
          {accounts.map((a) => `${a.bank} ${a.accountNumber}`).join(" · ")}
        </Alert>
      ) : (
        <Alert tone="danger" className="mt-4 max-w-2xl">
          Settlement accounts are missing. Contact support before ordering.
        </Alert>
      )}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <CheckoutForm
          defaultEmail={user?.email}
          defaultName={user?.name}
          subtotalMinor={totals.subtotalMinor}
          currency={totals.currency}
        />
        <aside className="card h-fit space-y-3 p-6">
          <h2 className="font-semibold">Order summary</h2>
          <ul className="space-y-2 text-sm">
            {totals.lines.map((line) => (
              <li key={line.itemId} className="flex justify-between gap-3">
                <span>
                  {line.title} × {line.quantity}
                </span>
                <span className="tabular-nums">
                  {formatMoney(line.lineTotalMinor, line.currency)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-[var(--color-text-muted)]">
            Delivery fee is calculated from your city &amp; state on the form.
          </p>
          <div className="flex justify-between border-t border-[var(--color-border)] pt-3 font-semibold">
            <span>Items</span>
            <span className="tabular-nums">
              {formatMoney(totals.subtotalMinor, totals.currency)}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            <Link href="/cart" className="underline">
              Edit cart
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
