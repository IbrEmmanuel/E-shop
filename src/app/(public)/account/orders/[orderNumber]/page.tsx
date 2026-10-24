import Link from "next/link";
import { notFound } from "next/navigation";
import { BankTransferPay } from "@/components/payments/bank-transfer-pay";
import { OrderTracker } from "@/components/orders/order-tracker";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettlementAccounts } from "@/lib/payments/settlement";
import { buildMetadata } from "@/lib/seo";
import { buildOrderTracking } from "@/services/orders";

type Props = { params: Promise<{ orderNumber: string }> };

export async function generateMetadata({ params }: Props) {
  const { orderNumber } = await params;
  return buildMetadata({
    title: `Track ${orderNumber}`,
    path: `/account/orders/${orderNumber}`,
    noIndex: true,
  });
}

export default async function TrackOrderPage({ params }: Props) {
  const { orderNumber } = await params;
  const user = await getSessionUser();

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const canView =
    (user && order.userId === user.id) ||
    user?.role === "ADMIN" ||
    (!order.userId && Boolean(order.guestEmail));

  if (!canView) {
    return (
      <div className="py-8">
        <Alert tone="danger">
          Sign in with the account that placed this order to track it.
        </Alert>
        <Button asChild href="/login" className="mt-4">
          Sign in
        </Button>
      </div>
    );
  }

  const payment = order.payments[0];
  const tracking = buildOrderTracking(order);
  const accounts = getSettlementAccounts();

  return (
    <div className="space-y-8">
      <div>
        <Badge
          tone={
            order.status === "DELIVERED" || order.status === "PAID"
              ? "success"
              : "info"
          }
        >
          {order.status.replaceAll("_", " ")}
        </Badge>
        <h1
          className="mt-2 text-3xl"
        >
          {order.orderNumber}
        </h1>
        <p
          className="mt-1 text-[var(--color-text-secondary)]"
          suppressHydrationWarning
        >
          Placed{" "}
          {order.createdAt.toLocaleString("en-NG", {
            timeZone: "Africa/Lagos",
          })}{" "}
          · Total {formatMoney(order.totalMinor, order.currency)}
        </p>
      </div>

      <OrderTracker
        steps={tracking.steps}
        etaLabel={tracking.etaLabel}
        locationHint={tracking.locationHint}
      />

      <div className="card space-y-2 p-5 text-sm">
        <h2 className="font-semibold">Charges</h2>
        <div className="flex justify-between">
          <span>Items</span>
          <span className="tabular-nums">
            {formatMoney(order.subtotalMinor, order.currency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Delivery to {[order.shippingCity, order.shippingState].filter(Boolean).join(", ") || "address"}</span>
          <span className="tabular-nums">
            {formatMoney(order.shippingMinor, order.currency)}
          </span>
        </div>
        <div className="flex justify-between border-t border-[var(--color-border)] pt-2 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">
            {formatMoney(order.totalMinor, order.currency)}
          </span>
        </div>
      </div>

      <ul className="card divide-y divide-[var(--color-border)]">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex justify-between gap-3 px-4 py-3 text-sm"
          >
            <span>
              {item.titleSnapshot} × {item.quantity}
            </span>
            <span className="tabular-nums">
              {formatMoney(item.lineTotalMinor, item.currency)}
            </span>
          </li>
        ))}
      </ul>

      {order.status === "PENDING_PAYMENT" && payment?.provider === "bank_transfer" ? (
        <BankTransferPay
          orderNumber={order.orderNumber}
          amountMinor={order.totalMinor}
          currency={order.currency}
          accounts={accounts}
          paymentStatus={payment.status}
        />
      ) : null}

      <Button asChild href="/account/orders" variant="outline">
        All orders
      </Button>
      <Link href="/shop" className="ml-3 text-sm underline">
        Continue shopping
      </Link>
    </div>
  );
}
