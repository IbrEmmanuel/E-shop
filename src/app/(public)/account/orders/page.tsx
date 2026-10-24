import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default async function AccountOrdersPage() {
  const user = await getSessionUser();
  const orders = user
    ? await prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  if (!user) {
    return (
      <EmptyState
        title="Track an order"
        description="Use the link from your order confirmation email, or open the confirmation page with your order number."
        action={
          <Button asChild href="/shop" variant="accent">
            Continue shopping
          </Button>
        }
      />
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        action={
          <Button asChild href="/shop" variant="accent">
            Start shopping
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1
          className="text-3xl"
        >
          Your orders
        </h1>
      </header>
    <ul className="space-y-3">
      {orders.map((o) => (
        <li
          key={o.id}
          className="card flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <div>
            <Link
              href={`/account/orders/${o.orderNumber}`}
              className="font-semibold underline"
            >
              {o.orderNumber}
            </Link>
            <p
              className="text-sm text-[var(--color-text-muted)]"
              suppressHydrationWarning
            >
              {o.createdAt.toLocaleString("en-NG", {
                timeZone: "Africa/Lagos",
              })}
              {o.shippingCity ? ` · ${o.shippingCity}` : ""}
              {o.etaLatestAt
                ? ` · ETA ${o.etaLatestAt.toLocaleDateString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}`
                : ""}
            </p>
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
              Track order
            </Link>
          </div>
        </li>
      ))}
    </ul>
    </div>
  );
}
