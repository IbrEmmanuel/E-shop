import { SectionHeader } from "@/components/dashboard/section-header";
import { VendorTabs } from "@/components/dashboard/vendor-tabs";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import {
  ensureUserWorkspace,
  ensureVendorWallet,
  getVendorWorkspaceStats,
} from "@/services/workspace";
import { prisma } from "@/lib/db";
import { AdminVendorActions } from "@/components/forms/admin-vendor-actions";
import { Badge } from "@/components/ui/badge";

export default async function VendorOverviewPage() {
  const session = await getSessionUser();
  const user = await ensureUserWorkspace(session!);

  // Admins review applications and manage shops from Vendor tabs.
  let stats = {
    activeProducts: 0,
    totalOrders: 0,
    grossSalesMinor: 0,
    walletBalanceMinor: 0,
    currency: "NGN",
  };

  if (user.vendor) {
    await ensureVendorWallet(user.vendor.id);
    stats = await getVendorWorkspaceStats(user.vendor.id);
  } else if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
    const [activeProducts, orderAgg] = await Promise.all([
      prisma.product.count({ where: { status: "PUBLISHED" } }),
      prisma.vendorOrder.findMany({
        select: { totalMinor: true, status: true },
      }),
    ]);
    stats = {
      activeProducts,
      totalOrders: orderAgg.length,
      grossSalesMinor: orderAgg
        .filter((o) =>
          ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status),
        )
        .reduce((s, o) => s + o.totalMinor, 0),
      walletBalanceMinor: 0,
      currency: "NGN",
    };
  }

  const applications =
    (user.role === "ADMIN" || user.role === "SUPER_ADMIN")
      ? await prisma.vendorApplication.findMany({
          where: {
            status: { in: ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: { select: { email: true, name: true } },
            rentalPlan: true,
          },
        })
      : [];

  const activeVendors =
    user.role === "ADMIN" || user.role === "SUPER_ADMIN"
      ? await prisma.vendor.findMany({
          where: { status: "ACTIVE" },
          orderBy: { storeName: "asc" },
          take: 40,
          select: {
            id: true,
            storeName: true,
            contactEmail: true,
            user: { select: { email: true } },
          },
        })
      : [];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Vendor"
        description="Products, bulk import, orders, and wallet."
        userName={user.name}
      />
      <VendorTabs />

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Active products
          </p>
          <p className="mt-3 text-3xl font-semibold tabular-nums">
            {stats.activeProducts}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Total orders
          </p>
          <p className="mt-3 text-3xl font-semibold tabular-nums">
            {stats.totalOrders}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Gross sales
          </p>
          <p className="mt-3 text-3xl font-semibold tabular-nums">
            {formatMoney(stats.grossSalesMinor, stats.currency)}
          </p>
        </div>
      </section>

      <div className="button-group justify-start">
        <Button asChild href="/admin/vendors/products" variant="primary">
          Manage products
        </Button>
        <Button asChild href="/admin/vendors/bulk" variant="outline">
          Bulk upload
        </Button>
        <Button asChild href="/admin/vendors/orders" variant="secondary">
          Sales orders
        </Button>
        <Button asChild href="/admin/vendors/wallet" variant="ghost">
          Wallet
        </Button>
      </div>

      {!user.vendor ? (
        <div className="card p-5">
          <p className="font-semibold">No personal storefront yet</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Sellers apply from the public sell page. Review applications below
            and manage catalogs under Vendor products, orders, and settings.
          </p>
          <div className="mt-4">
            <Button asChild href="/vendor/apply" variant="accent">
              Become a vendor
            </Button>
          </div>
        </div>
      ) : null}

      {activeVendors.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-2xl">Active shops</h2>
          <ul className="space-y-3">
            {activeVendors.map((v) => (
              <li
                key={v.id}
                className="card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-semibold">{v.storeName}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {v.contactEmail || v.user.email}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    asChild
                    href={`/vendor?vendorId=${encodeURIComponent(v.id)}`}
                    size="sm"
                    variant="outline"
                  >
                    Inspect desk
                  </Button>
                  <Button
                    asChild
                    href={`/vendor/orders?vendorId=${encodeURIComponent(v.id)}`}
                    size="sm"
                    variant="ghost"
                  >
                    Orders
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {applications.length > 0 ? (
        <section className="space-y-4">
          <h2
            className="text-2xl"
          >
            Applications queue
          </h2>
          <ul className="space-y-4">
            {applications.map((app) => (
              <li key={app.id} className="card space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{app.storeName}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {app.user.email} · {app.rentalPlan?.name}
                    </p>
                  </div>
                  <Badge tone="warning">{app.status}</Badge>
                </div>
                <AdminVendorActions applicationId={app.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
