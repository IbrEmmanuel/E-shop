import Link from "next/link";
import { redirect } from "next/navigation";
import { RentPayForm } from "@/components/forms/rent-pay-form";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { paymentsConfigured } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { getSettlementAccounts } from "@/lib/payments/settlement";
import { isStaffRole } from "@/lib/roles";
import { resolveVendorDesk, vendorDeskQuery } from "@/lib/vendor-desk";
import { prisma } from "@/lib/db";
import { checkVendorProductQuota } from "@/services/rentals";
import { getVendorMetrics } from "@/services/vendors";
import {
  ensureVendorWallet,
  getVendorWorkspaceStats,
} from "@/services/workspace";

export default async function VendorOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ vendorId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/vendor");

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

  const [metrics, stats, wallet, recentOrders, quota] = await Promise.all([
    getVendorMetrics(user, vendor.id),
    getVendorWorkspaceStats(vendor.id),
    ensureVendorWallet(vendor.id),
    prisma.vendorOrder.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        order: { select: { orderNumber: true, createdAt: true } },
      },
    }),
    checkVendorProductQuota(vendor.id, 0).catch(() => null),
  ]);

  return (
    <div>
      <header className="account-hero">
        {inspecting ? (
          <Badge tone="warning" className="mb-2">
            Inspecting as admin
          </Badge>
        ) : null}
        <h1 className="account-hero__title">{vendor.storeName}</h1>
        <p className="account-hero__lede">
          Manage catalogue, fulfilment, and payouts for this shop.
          {vendor.rental ? (
            <>
              {" "}
              Plan: {vendor.rental.plan.name} ({vendor.rental.status}).
            </>
          ) : null}
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="account-panel">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Products
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {metrics.publishedCount}/{metrics.productCount}
          </p>
        </div>
        <div className="account-panel">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Plan capacity
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {quota
              ? `${quota.used.toLocaleString("en-NG")}/${quota.max.toLocaleString("en-NG")}`
              : "—"}
          </p>
        </div>
        <div className="account-panel">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Orders
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {stats.totalOrders}
          </p>
        </div>
        <div className="account-panel">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Wallet
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {formatMoney(wallet.balanceMinor, wallet.currency)}
          </p>
        </div>
      </div>

      {vendor.rental ? (
        <section className="account-panel mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Monthly rental</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {vendor.rental.plan.name} ·{" "}
                {formatMoney(
                  vendor.rental.plan.monthlyPriceMinor,
                  vendor.rental.plan.currency,
                )}
                /mo
              </p>
            </div>
            <Badge
              tone={
                vendor.rental.status === "ACTIVE" ||
                vendor.rental.status === "TRIAL"
                  ? "success"
                  : "warning"
              }
            >
              {vendor.rental.status}
            </Badge>
          </div>
          <Alert tone="info">
            Transfer rent to{" "}
            {getSettlementAccounts()
              .map((a) => `${a.bank} ${a.accountNumber}`)
              .join(" · ")}
            . Generate an invoice for a unique narration reference.
          </Alert>
          {!inspecting ? (
            <RentPayForm
              vendorId={vendor.id}
              paystackAvailable={paymentsConfigured()}
            />
          ) : null}
        </section>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild href={`/vendor/products${q}`} variant="primary">
          Products
        </Button>
        <Button asChild href={`/vendor/orders${q}`} variant="outline">
          Orders
        </Button>
        <Button asChild href={`/vendor/earnings${q}`} variant="outline">
          Earnings
        </Button>
        {inspecting ? (
          <Button asChild href="/admin/vendors" variant="ghost">
            Back to admin
          </Button>
        ) : null}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <ul className="mt-4 space-y-2">
          {recentOrders.map((vo) => (
            <li
              key={vo.id}
              className="flex justify-between gap-3 border-b border-[var(--color-border)] py-2 text-sm"
            >
              <Link
                href={`/vendor/orders${q}`}
                className="font-medium hover:underline"
              >
                {vo.order.orderNumber}
              </Link>
              <span className="tabular-nums text-[var(--color-text-muted)]">
                {formatMoney(vo.totalMinor, "NGN")} · {vo.status}
              </span>
            </li>
          ))}
          {recentOrders.length === 0 ? (
            <li className="text-sm text-[var(--color-text-muted)]">
              No orders yet.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
