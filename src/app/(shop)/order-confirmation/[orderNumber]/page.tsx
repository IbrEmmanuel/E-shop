import { BankTransferPay } from "@/components/payments/bank-transfer-pay";
import { OrderTracker } from "@/components/orders/order-tracker";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { buildMetadata } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { getSessionUser } from "@/lib/auth";
import { getSettlementAccounts } from "@/lib/payments/settlement";
import { buildOrderTracking, markOrderPaidFromProvider } from "@/services/orders";

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { orderNumber } = await params;
  return buildMetadata({
    title: `Order ${orderNumber}`,
    path: `/order-confirmation/${orderNumber}`,
    noIndex: true,
  });
}

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: Props) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  const user = await getSessionUser();

  const order = await prisma.order
    .findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    })
    .catch(() => null);

  if (!order) {
    return (
      <div className="container-page py-14">
        <Alert tone="danger">Order not found.</Alert>
      </div>
    );
  }

  const canView =
    (user && order.userId === user.id) ||
    (!order.userId && order.guestEmail) ||
    (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN");

  if (!canView && user) {
    return (
      <div className="container-page py-14">
        <Alert tone="danger">You do not have access to this order.</Alert>
      </div>
    );
  }

  const ref =
    typeof sp.reference === "string"
      ? sp.reference
      : typeof sp.trxref === "string"
        ? sp.trxref
        : null;

  if (ref && order.status === "PENDING_PAYMENT") {
    await markOrderPaidFromProvider({
      providerRef: ref,
      expectedOrderId: order.id,
    }).catch(() => null);
  }

  const view =
    (await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    })) ?? order;

  const payment = view.payments[0];
  const isBank = payment?.provider === "bank_transfer";
  const isPaystack = payment?.provider === "paystack";
  const accounts = getSettlementAccounts();
  const tracking = buildOrderTracking(view);
  const methodId =
    typeof sp.method === "string" ? sp.method : undefined;
  const accountId =
    typeof sp.account === "string" ? sp.account : undefined;
  let paymentMeta: {
    method?: string;
    preferredAccountId?: string;
    authorizationUrl?: string;
    channelLabel?: string;
  } = {};
  if (payment?.rawMetaJson) {
    try {
      paymentMeta = JSON.parse(payment.rawMetaJson) as typeof paymentMeta;
    } catch {
      paymentMeta = {};
    }
  }

  return (
    <div className="container-page max-w-2xl space-y-8 py-10 md:py-14">
      <div>
        <Badge tone={view.status === "PAID" || view.status === "DELIVERED" ? "success" : "warning"}>
          {view.status.replaceAll("_", " ")}
        </Badge>
        <h1
          className="type-h1 mt-3"
        >
          Order {view.orderNumber}
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Total {formatMoney(view.totalMinor, view.currency)}
          {view.shippingCity
            ? ` · delivering to ${view.shippingCity}${view.shippingState ? `, ${view.shippingState}` : ""}`
            : ""}
        </p>
      </div>

      <OrderTracker
        steps={tracking.steps}
        etaLabel={tracking.etaLabel}
        locationHint={tracking.locationHint}
      />

      {view.status === "PAID" ||
      view.status === "PROCESSING" ||
      view.status === "SHIPPED" ||
      view.status === "DELIVERED" ? (
        <Alert tone="success">Payment confirmed. We are preparing your order.</Alert>
      ) : isBank && payment ? (
        <BankTransferPay
          orderNumber={view.orderNumber}
          amountMinor={view.totalMinor}
          currency={view.currency}
          accounts={accounts}
          paymentStatus={payment.status}
          preferredAccountId={
            accountId || paymentMeta.preferredAccountId || null
          }
          methodId={methodId || paymentMeta.method || "uba"}
          defaultPaidVia={paymentMeta.channelLabel}
        />
      ) : isPaystack &&
        payment &&
        payment.status !== "SUCCEEDED" &&
        paymentMeta.authorizationUrl ? (
        <div className="space-y-3">
          <Alert tone="info">
            Complete payment in the hosted checkout
            {paymentMeta.channelLabel
              ? ` (${paymentMeta.channelLabel})`
              : ""}
            . We confirm the order once the provider reports success.
          </Alert>
          <Button asChild href={paymentMeta.authorizationUrl} variant="primary">
            Open checkout
          </Button>
        </div>
      ) : (
        <Alert tone="info">Payment is still pending for this order.</Alert>
      )}

      <div className="space-y-3 border-t border-[var(--color-border)] pt-6 text-sm">
        <div className="flex justify-between">
          <span>Items</span>
          <span className="tabular-nums">
            {formatMoney(view.subtotalMinor, view.currency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Delivery</span>
          <span className="tabular-nums">
            {formatMoney(view.shippingMinor, view.currency)}
          </span>
        </div>
        <div className="flex justify-between border-t border-[var(--color-border)] pt-3 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">
            {formatMoney(view.totalMinor, view.currency)}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {view.items.map((item) => (
          <li
            key={item.id}
            className="flex justify-between gap-4 py-3 text-sm"
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

      <div className="flex flex-wrap gap-3">
        <Button asChild href={`/account/orders/${view.orderNumber}`} variant="primary">
          Track order
        </Button>
        <Button asChild href="/shop" variant="outline">
          Keep shopping
        </Button>
      </div>
    </div>
  );
}
