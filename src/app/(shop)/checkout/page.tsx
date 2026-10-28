import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/forms/checkout-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentsConfigured } from "@/lib/env";
import { bankTransferAvailable } from "@/lib/payments/settlement";
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
  if (!user) {
    redirect("/login?callbackUrl=/checkout");
  }

  const hosted = paymentsConfigured();
  const bankEnabled = bankTransferAvailable();
  const paymentsReady = hosted || bankEnabled;

  const [totals, addresses] = await Promise.all([
    getCartTotals({
      userId: user.id,
      guestKey: null,
    }).catch(() => null),
    prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
  ]);

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
      <p className="mt-2 max-w-lg text-sm text-[var(--color-text-secondary)]">
        Signed in as {user.email}. Confirm delivery, choose OPay / UBA / bank,
        then we create a payment request and verify before packing.
      </p>
      {!paymentsReady ? (
        <Alert tone="danger" className="mt-4 max-w-lg">
          Payments are temporarily unavailable. Please try again later.
        </Alert>
      ) : null}
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        <CheckoutForm
          defaultEmail={user.email}
          defaultName={user.name}
          subtotalMinor={totals.subtotalMinor}
          currency={totals.currency}
          addresses={addresses}
          hostedCheckoutAvailable={hosted}
        />
        <aside className="checkout-summary h-fit">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--color-text-muted)]">
            Confirm bag
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {totals.lines.map((line) => (
              <li key={line.itemId} className="flex justify-between gap-4">
                <span className="min-w-0">
                  <span className="line-clamp-2">{line.title}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {" "}
                    × {line.quantity}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatMoney(line.lineTotalMinor, line.currency)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-between border-t border-[var(--color-border)] pt-4 text-sm font-semibold">
            <span>Items</span>
            <span className="tabular-nums">
              {formatMoney(totals.subtotalMinor, totals.currency)}
            </span>
          </div>
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            <Link href="/cart" className="underline underline-offset-2">
              Edit bag
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
