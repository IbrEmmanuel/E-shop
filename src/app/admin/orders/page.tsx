import Link from "next/link";
import { ConfirmTransferButton } from "@/components/payments/confirm-transfer-button";
import { FulfillmentActions } from "@/components/payments/fulfillment-actions";
import { RefundOrderButton } from "@/components/payments/refund-order-button";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/db";
import { expireStaleUnpaidOrders } from "@/services/orders";

type PaymentMeta = {
  paidVia?: string;
  transferRef?: string;
  proofUrl?: string;
};

export default async function AdminOrdersPage() {
  const session = await getSessionUser();
  const isAdmin = (session?.role === "ADMIN" || session?.role === "SUPER_ADMIN");

  if (isAdmin) {
    await expireStaleUnpaidOrders(48).catch(() => 0);
  }

  const orders = await prisma.order.findMany({
    where: isAdmin ? undefined : { userId: session!.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: { select: { items: true } },
      payments: { take: 1, orderBy: { createdAt: "desc" } },
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <div>
      <SectionHeader
        title="Orders"
        description={
          isAdmin
            ? "Approve payment proofs, then pack and ship so customers can track ETA."
            : "Track payments and delivery status."
        }
        userName={session?.name}
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Marketplace checkouts will appear here once customers place orders."
          action={
            <Button asChild href="/shop" variant="primary">
              Browse marketplace
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const payment = o.payments[0];
            let meta: PaymentMeta = {};
            try {
              meta = payment?.rawMetaJson
                ? (JSON.parse(payment.rawMetaJson) as PaymentMeta)
                : {};
            } catch {
              meta = {};
            }

            const needsConfirm =
              isAdmin &&
              o.status === "PENDING_PAYMENT" &&
              payment &&
              (payment.status === "REQUIRES_ACTION" ||
                payment.status === "PENDING");
            const underInvestigation =
              isAdmin && payment?.investigationStatus === "OPEN";

            return (
              <li
                key={o.id}
                className="card flex flex-wrap items-start justify-between gap-4 p-5 shadow-[var(--shadow-sm)]"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-semibold">{o.orderNumber}</p>
                  <p
                    className="text-sm text-[var(--color-text-muted)]"
                    suppressHydrationWarning
                  >
                    {o.createdAt.toLocaleString("en-NG", {
                      timeZone: "Africa/Lagos",
                    })}{" "}
                    · {o._count.items} items
                    {isAdmin && o.user
                      ? ` · ${o.user.name || o.user.email}`
                      : o.guestEmail
                        ? ` · ${o.guestEmail}`
                        : ""}
                  </p>
                  <p
                    className="text-xs text-[var(--color-text-secondary)]"
                    suppressHydrationWarning
                  >
                    Delivery: {[o.shippingCity, o.shippingState]
                      .filter(Boolean)
                      .join(", ") || "—"}{" "}
                    · fee {formatMoney(o.shippingMinor, o.currency)}
                    {o.etaLatestAt
                      ? ` · ETA by ${o.etaLatestAt.toLocaleDateString("en-NG", {
                          timeZone: "Africa/Lagos",
                        })}`
                      : ""}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {payment
                      ? `${payment.provider.replaceAll("_", " ")} · ${payment.status}`
                      : "No payment"}
                    {meta.paidVia
                      ? ` · via ${meta.paidVia}${meta.transferRef ? ` (${meta.transferRef})` : ""}`
                      : ""}
                  </p>
                  {underInvestigation ? (
                    <p className="text-xs font-semibold text-[var(--color-danger)]">
                      Investigation: {payment?.investigationNote}
                    </p>
                  ) : null}
                  {meta.proofUrl ? (
                    <a
                      href={meta.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] underline"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={meta.proofUrl}
                        alt="Payment proof"
                        className="size-12 rounded object-cover"
                      />
                      View payment proof
                    </a>
                  ) : needsConfirm ? (
                    <p className="text-xs text-[var(--color-warning)]">
                      Waiting for customer payment proof
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <Badge
                    tone={
                      o.status === "PAID" || o.status === "DELIVERED"
                        ? "success"
                        : underInvestigation ||
                            payment?.status === "REQUIRES_ACTION"
                          ? "warning"
                          : "info"
                    }
                  >
                    {underInvestigation ? "INVESTIGATION" : o.status}
                  </Badge>
                  <p className="font-semibold tabular-nums">
                    {formatMoney(o.totalMinor, o.currency)}
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {needsConfirm && meta.proofUrl ? (
                      <ConfirmTransferButton
                        orderId={o.id}
                        expectedAmountLabel={formatMoney(
                          o.totalMinor,
                          o.currency,
                        )}
                        reportedRef={meta.transferRef}
                      />
                    ) : null}
                    {isAdmin ? (
                      <FulfillmentActions orderId={o.id} status={o.status} />
                    ) : null}
                    {isAdmin &&
                    ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(
                      o.status,
                    ) ? (
                      <RefundOrderButton orderId={o.id} />
                    ) : null}
                    <Link
                      href={`/admin/orders/${o.orderNumber}`}
                      className="text-sm font-semibold underline"
                    >
                      Detail
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
