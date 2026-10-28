import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CancelUnpaidOrderButton,
  ConfirmDeliveryButton,
} from "@/components/orders/order-customer-actions";
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
      vendorOrders: {
        select: {
          trackingNumber: true,
          status: true,
          vendor: { select: { storeName: true } },
        },
      },
    },
  });
  if (!order) notFound();

  const canView =
    (user && order.userId === user.id) ||
    (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") ||
    (!order.userId && Boolean(order.guestEmail));

  if (!canView) {
    return (
      <div>
        <header className="account-hero">
          <h1 className="account-hero__title">Order locked</h1>
          <p className="account-hero__lede">
            Sign in with the account that placed this order to track it.
          </p>
        </header>
        <Alert tone="danger">
          This order belongs to another account.
        </Alert>
        <Button
          asChild
          href={`/login?callbackUrl=/account/orders/${orderNumber}`}
          className="mt-4"
        >
          Sign in
        </Button>
      </div>
    );
  }

  const payment = order.payments[0];
  const tracking = buildOrderTracking(order);
  const accounts = getSettlementAccounts();

  return (
    <div>
      <header className="account-hero">
        <Badge
          tone={
            order.status === "DELIVERED" || order.status === "PAID"
              ? "success"
              : "info"
          }
        >
          {order.status.replaceAll("_", " ")}
        </Badge>
        <h1 className="account-hero__title mt-2">{order.orderNumber}</h1>
        <p className="account-hero__lede" suppressHydrationWarning>
          Placed{" "}
          {order.createdAt.toLocaleString("en-NG", {
            timeZone: "Africa/Lagos",
          })}{" "}
          · Total {formatMoney(order.totalMinor, order.currency)}
        </p>
      </header>

      <div className="space-y-4">
        <OrderTracker
          steps={tracking.steps}
          etaLabel={tracking.etaLabel}
          locationHint={tracking.locationHint}
        />

        {order.vendorOrders.some((vo) => vo.trackingNumber) ? (
          <section className="account-panel">
            <div className="account-panel__head">
              <h2 className="account-panel__title">Shipping & tracking</h2>
            </div>
            <ul className="space-y-2 text-sm">
              {order.vendorOrders
                .filter((vo) => vo.trackingNumber)
                .map((vo, i) => (
                  <li key={`${vo.trackingNumber}-${i}`}>
                    <span className="text-[var(--color-text-muted)]">
                      {vo.vendor.storeName}:{" "}
                    </span>
                    <span className="font-mono">{vo.trackingNumber}</span>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        <section className="account-panel">
          <div className="account-panel__head">
            <h2 className="account-panel__title">Charges</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Items</span>
              <span className="tabular-nums">
                {formatMoney(order.subtotalMinor, order.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>
                Delivery to{" "}
                {[order.shippingCity, order.shippingState]
                  .filter(Boolean)
                  .join(", ") || "address"}
              </span>
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
        </section>

        <section className="account-panel">
          <div className="account-panel__head">
            <h2 className="account-panel__title">Items</h2>
          </div>
          {order.items.map((item) => (
            <div key={item.id} className="account-order">
              <p className="account-order__id">
                {item.titleSnapshot} × {item.quantity}
              </p>
              <p className="font-semibold tabular-nums">
                {formatMoney(item.lineTotalMinor, item.currency)}
              </p>
            </div>
          ))}
        </section>

        {order.status === "PENDING_PAYMENT" &&
        payment?.provider === "bank_transfer" ? (
          <BankTransferPay
            orderNumber={order.orderNumber}
            amountMinor={order.totalMinor}
            currency={order.currency}
            accounts={accounts}
            paymentStatus={payment.status}
            preferredAccountId={(() => {
              try {
                const m = payment.rawMetaJson
                  ? (JSON.parse(payment.rawMetaJson) as {
                      preferredAccountId?: string;
                    })
                  : {};
                return m.preferredAccountId ?? null;
              } catch {
                return null;
              }
            })()}
            methodId={(() => {
              try {
                const m = payment.rawMetaJson
                  ? (JSON.parse(payment.rawMetaJson) as { method?: string })
                  : {};
                return m.method || "uba";
              } catch {
                return "uba";
              }
            })()}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {order.status === "PENDING_PAYMENT" ? (
            <CancelUnpaidOrderButton orderId={order.id} />
          ) : null}
          {order.status === "SHIPPED" || order.status === "PROCESSING" ? (
            <ConfirmDeliveryButton orderId={order.id} />
          ) : null}
          <Button asChild href="/account/orders" variant="outline" size="sm">
            All orders
          </Button>
          <Link
            href="/shop"
            className="text-sm font-semibold text-[var(--color-primary)]"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
