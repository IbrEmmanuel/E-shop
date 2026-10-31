import Link from "next/link";
import { SectionHeader } from "@/components/dashboard/section-header";
import { VendorTabs } from "@/components/dashboard/vendor-tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { VendorOrderActions } from "@/components/vendor/vendor-order-actions";
import { VendorOrderTabs } from "@/components/vendor/vendor-order-tabs";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import {
  vendorOrderBadgeTone,
  vendorOrderTabLabel,
} from "@/lib/vendor-order-status";
import {
  countVendorOrdersByTab,
  listVendorOrders,
  parseVendorOrderTab,
} from "@/services/vendor-orders";
import { ensureUserWorkspace } from "@/services/workspace";

export default async function VendorSalesOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const session = await getSessionUser();
  const user = await ensureUserWorkspace(session!);
  const params = (await searchParams) ?? {};
  const tab = parseVendorOrderTab(params.tab);

  const scopeVendorId =
    user.vendor?.id ?? ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? null : undefined);

  if (scopeVendorId === undefined) {
    return (
      <div className="space-y-8">
        <SectionHeader
          title="Vendor"
          description="Products, bulk import, orders, and wallet."
          userName={user.name}
        />
        <VendorTabs />
        <EmptyState
          title="No vendor shop"
          description="Open a shop rental to manage fulfillment here."
        />
      </div>
    );
  }

  const [counts, orders] = await Promise.all([
    countVendorOrdersByTab(scopeVendorId),
    listVendorOrders({ vendorId: scopeVendorId, tab }),
  ]);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Vendor"
        description="Products, bulk import, orders, and wallet."
        userName={user.name}
      />
      <VendorTabs />

      <div className="space-y-4">
        <div>
          <h2
            className="text-2xl"
          >
            Orders
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Admin-only: accept new paid orders, package, then mark shipped or
            delivered. Customers track ETA from their account.
          </p>
        </div>

        <VendorOrderTabs
          active={tab}
          counts={counts}
          basePath="/admin/vendors/orders"
        />

        {orders.length === 0 ? (
          <EmptyState
            title={
              tab === "all"
                ? "No sales orders"
                : `No ${TAB_EMPTY[tab]} orders`
            }
            description={
              tab === "new"
                ? "Paid orders waiting for acceptance will show here."
                : "Vendor sub-orders appear here after customers check out."
            }
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((vo) => {
              const destination = [
                vo.order.shippingCity,
                vo.order.shippingState,
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <li key={vo.id} className="card p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{vo.order.orderNumber}</p>
                        <Badge tone={vendorOrderBadgeTone(vo.status)}>
                          {vendorOrderTabLabel(vo.status)}
                        </Badge>
                        {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && vo.vendor ? (
                          <span className="text-xs font-medium text-[var(--color-text-muted)]">
                            {vo.vendor.storeName}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className="text-sm text-[var(--color-text-muted)]"
                        suppressHydrationWarning
                      >
                        {vo.order.createdAt.toLocaleString("en-NG", {
                          timeZone: "Africa/Lagos",
                        })}{" "}
                        · {vo.items.length}{" "}
                        {vo.items.length === 1 ? "item" : "items"}
                        {vo.order.shippingName
                          ? ` · ${vo.order.shippingName}`
                          : ""}
                      </p>
                      {destination ? (
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          Deliver to {destination}
                          {vo.order.etaLatestAt
                            ? ` · ETA by ${vo.order.etaLatestAt.toLocaleDateString(
                                "en-NG",
                                { timeZone: "Africa/Lagos" },
                              )}`
                            : ""}
                        </p>
                      ) : null}
                      <ul className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                        {vo.items.map((item) => (
                          <li key={item.id}>
                            {item.titleSnapshot} × {item.quantity}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`/admin/orders/${vo.order.orderNumber}`}
                        className="inline-block text-sm font-semibold text-[var(--color-primary)] underline"
                      >
                        Order detail
                      </Link>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <p className="font-semibold tabular-nums">
                        {formatMoney(vo.totalMinor, vo.order.currency)}
                      </p>
                      {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? (
                        <VendorOrderActions
                          vendorOrderId={vo.id}
                          status={vo.status}
                        />
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const TAB_EMPTY: Record<
  Exclude<ReturnType<typeof parseVendorOrderTab>, "all">,
  string
> = {
  new: "new",
  accepted: "accepted",
  packaged: "packaged",
  shipped: "shipped/delivered",
};
