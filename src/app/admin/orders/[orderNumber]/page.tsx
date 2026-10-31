import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfirmTransferButton } from "@/components/payments/confirm-transfer-button";
import { FulfillmentActions } from "@/components/payments/fulfillment-actions";
import { RefundOrderButton } from "@/components/payments/refund-order-button";
import { OrderTracker } from "@/components/orders/order-tracker";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatCommissionPct } from "@/lib/commission";
import { buildOrderTracking } from "@/services/orders";

type Props = { params: Promise<{ orderNumber: string }> };

type PaymentMeta = {
  paidVia?: string;
  transferRef?: string;
  proofUrl?: string;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/admin/orders");
  if (!isAdmin(user)) redirect("/account");

  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      user: { select: { id: true, name: true, email: true } },
      vendorOrders: {
        include: {
          vendor: { select: { storeName: true, slug: true, commissionBps: true } },
          items: true,
        },
      },
    },
  });
  if (!order) notFound();

  const payment = order.payments[0];
  let meta: PaymentMeta = {};
  try {
    meta = payment?.rawMetaJson
      ? (JSON.parse(payment.rawMetaJson) as PaymentMeta)
      : {};
  } catch {
    meta = {};
  }

  const tracking = buildOrderTracking(order);
  const needsConfirm =
    order.status === "PENDING_PAYMENT" &&
    payment &&
    (payment.status === "REQUIRES_ACTION" || payment.status === "PENDING") &&
    Boolean(meta.proofUrl);

  return (
    <div className="space-y-8">
      <SectionHeader
        title={order.orderNumber}
        description="Payment status, vendor fulfilment splits, timeline, and authorized actions."
        userName={user.name}
      />

      <p className="text-sm">
        <Link href="/admin/orders" className="font-semibold underline">
          ← All orders
        </Link>
        {" · "}
        <Link
          href={`/account/orders/${order.orderNumber}`}
          className="font-semibold underline"
        >
          Customer track view
        </Link>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="info">Order {order.status}</Badge>
        <Badge
          tone={
            payment?.status === "SUCCEEDED"
              ? "success"
              : payment?.status === "REQUIRES_ACTION"
                ? "warning"
                : "info"
          }
        >
          Payment {payment?.status ?? "none"}
        </Badge>
        <p className="font-semibold tabular-nums">
          {formatMoney(order.totalMinor, order.currency)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-semibold">Customer & delivery</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {order.user
              ? `${order.user.name || "—"} · ${order.user.email}`
              : order.guestEmail || "Guest"}
          </p>
          <p className="text-sm">
            {[order.shippingName, order.shippingLine1, order.shippingCity, order.shippingState]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Phone {order.shippingPhone || "—"} · shipping{" "}
            {formatMoney(order.shippingMinor, order.currency)}
          </p>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-semibold">Payment</h2>
          {payment ? (
            <>
              <p className="text-sm">
                {payment.provider.replaceAll("_", " ")} · ref{" "}
                {payment.providerRef || payment.idempotencyKey}
              </p>
              {meta.transferRef ? (
                <p className="text-sm">Customer ref: {meta.transferRef}</p>
              ) : null}
              {meta.proofUrl ? (
                <a
                  href={meta.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[var(--color-primary)] underline"
                >
                  View transfer proof
                </a>
              ) : null}
              {payment.investigationStatus === "OPEN" ? (
                <p className="text-sm font-semibold text-[var(--color-danger)]">
                  Investigation open: {payment.investigationNote}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No payment row.</p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {needsConfirm ? (
              <ConfirmTransferButton
                orderId={order.id}
                expectedAmountLabel={formatMoney(order.totalMinor, order.currency)}
                reportedRef={meta.transferRef}
              />
            ) : null}
            <FulfillmentActions orderId={order.id} status={order.status} />
            {["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status) ? (
              <RefundOrderButton orderId={order.id} />
            ) : null}
          </div>
        </section>
      </div>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Vendor splits</h2>
        <ul className="space-y-4">
          {order.vendorOrders.map((vo) => (
            <li key={vo.id} className="border-b border-[var(--color-border)] pb-4 last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{vo.vendor.storeName}</p>
                <Badge tone="accent">{vo.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Subtotal {formatMoney(vo.totalMinor, order.currency)}
                {vo.commissionMinor != null
                  ? ` · commission ${formatMoney(vo.commissionMinor, order.currency)} (${formatCommissionPct(vo.commissionBpsSnapshot ?? vo.vendor.commissionBps)}) · net ${formatMoney(vo.vendorNetMinor ?? 0, order.currency)}`
                  : ` · rate ${formatCommissionPct(vo.vendor.commissionBps)} (settles on delivery)`}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {vo.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.titleSnapshot} ·{" "}
                    {formatMoney(item.lineTotalMinor, item.currency)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <OrderTracker
          steps={tracking.steps}
          etaLabel={tracking.etaLabel}
          locationHint={tracking.locationHint}
        />
        <ol className="space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
          {order.statusHistory.map((h) => (
            <li key={h.id} className="flex flex-wrap gap-2">
              <span className="font-semibold">{h.status}</span>
              <span className="text-[var(--color-text-muted)]" suppressHydrationWarning>
                {h.createdAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}
              </span>
              {h.note ? <span>· {h.note}</span> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
