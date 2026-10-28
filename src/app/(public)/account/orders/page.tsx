import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function AccountOrdersPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: { take: 2, select: { titleSnapshot: true, quantity: true } },
    },
  });

  return (
    <div>
      <header className="account-hero">
        <h1 className="account-hero__title">Orders</h1>
        <p className="account-hero__lede">
          Track payment, packing, and delivery for every order.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="account-panel space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            You have not placed an order yet.
          </p>
          <Button asChild href="/shop" variant="accent" size="sm">
            Start shopping
          </Button>
        </div>
      ) : (
        <div className="account-panel">
          {orders.map((o) => (
            <div key={o.id} className="account-order">
              <div className="min-w-0">
                <Link
                  href={`/account/orders/${o.orderNumber}`}
                  className="account-order__id hover:underline"
                >
                  {o.orderNumber}
                </Link>
                <p className="account-order__meta" suppressHydrationWarning>
                  {o.createdAt.toLocaleString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}
                  {o.shippingCity ? ` · ${o.shippingCity}` : ""}
                </p>
                {o.items.length > 0 ? (
                  <p className="mt-1 line-clamp-1 text-sm text-[var(--color-text-secondary)]">
                    {o.items
                      .map((i) => `${i.titleSnapshot} × ${i.quantity}`)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <Badge tone="info">{o.status.replaceAll("_", " ")}</Badge>
                <p className="mt-1 font-semibold tabular-nums">
                  {formatMoney(o.totalMinor, o.currency)}
                </p>
                <Link
                  href={`/account/orders/${o.orderNumber}`}
                  className="mt-1 inline-block text-sm font-semibold text-[var(--color-primary)]"
                >
                  {o.status === "PENDING_PAYMENT" ? "Pay / track" : "Track"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
