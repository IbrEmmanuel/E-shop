import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { VendorOrderActions } from "@/components/vendor/vendor-order-actions";
import { VendorOrderTabs } from "@/components/vendor/vendor-order-tabs";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { isStaffRole } from "@/lib/roles";
import { vendorOrderBadgeTone } from "@/lib/vendor-order-status";
import { resolveVendorDesk, vendorDeskQuery } from "@/lib/vendor-desk";
import {
  countVendorOrdersByTab,
  listVendorOrders,
  parseVendorOrderTab,
} from "@/services/vendor-orders";

const TAB_EMPTY: Record<string, string> = {
  all: "",
  new: "new",
  accepted: "accepted",
  packaged: "packaged",
  shipped: "shipped",
};

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; vendorId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/vendor/orders");

  const params = (await searchParams) ?? {};
  const desk = await resolveVendorDesk({
    userId: user.id,
    role: user.role,
    vendorId: params.vendorId,
  });
  if (!desk.ok) {
    if (isStaffRole(user.role)) redirect("/admin/vendors");
    redirect("/vendor/apply");
  }

  const { vendor, inspecting } = desk;
  const q = vendorDeskQuery(vendor.id, inspecting);
  const tab = parseVendorOrderTab(params.tab);

  const [counts, orders] = await Promise.all([
    countVendorOrdersByTab(vendor.id),
    listVendorOrders({ vendorId: vendor.id, tab }),
  ]);

  return (
    <div>
      <header className="account-hero">
        {inspecting ? (
          <Badge tone="warning" className="mb-2">
            Inspecting {vendor.storeName}
          </Badge>
        ) : null}
        <h1 className="account-hero__title">Orders</h1>
        <p className="account-hero__lede">
          Accept, package, ship, and deliver. Customers track ETA from their
          account.
        </p>
      </header>

      <VendorOrderTabs
        active={tab}
        counts={counts}
        basePath="/vendor/orders"
        vendorId={inspecting ? vendor.id : null}
      />

      {orders.length === 0 ? (
        <EmptyState
          title={`No ${TAB_EMPTY[tab] || ""} orders`.replace(/\s+/g, " ").trim()}
        />
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((vo) => (
            <li key={vo.id} className="account-panel space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{vo.order.orderNumber}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {formatMoney(vo.totalMinor, vo.order.currency)} ·{" "}
                    {vo.order.shippingCity || "—"}
                  </p>
                </div>
                <Badge tone={vendorOrderBadgeTone(vo.status)}>
                  {vo.status}
                </Badge>
              </div>
              <VendorOrderActions
                vendorOrderId={vo.id}
                status={vo.status}
              />
            </li>
          ))}
        </ul>
      )}

      {inspecting ? (
        <p className="mt-6 text-sm">
          <a href={`/vendor${q}`} className="underline underline-offset-2">
            Shop overview
          </a>
        </p>
      ) : null}
    </div>
  );
}
