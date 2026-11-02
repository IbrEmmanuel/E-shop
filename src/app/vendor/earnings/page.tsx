import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { isStaffRole } from "@/lib/roles";
import { resolveVendorDesk, vendorDeskQuery } from "@/lib/vendor-desk";
import { prisma } from "@/lib/db";
import {
  ensureVendorWallet,
  getVendorEarningsSummary,
} from "@/services/workspace";

export default async function VendorEarningsPage({
  searchParams,
}: {
  searchParams?: Promise<{ vendorId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/vendor/earnings");

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

  const wallet = await ensureVendorWallet(vendor.id);
  const earnings = await getVendorEarningsSummary(vendor.id);
  const ledger = await prisma.walletLedger.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const commissionPct = (vendor.commissionBps / 100).toFixed(1);

  return (
    <div>
      <header className="account-hero">
        {inspecting ? (
          <Badge tone="warning" className="mb-2">
            Inspecting as admin
          </Badge>
        ) : null}
        <h1 className="account-hero__title">Revenue</h1>
        <p className="account-hero__lede">
          Only your shop’s money. Net sales after {commissionPct}% platform
          commission settle here when orders are delivered.
        </p>
      </header>

      <div className="account-metrics mb-4">
        <div className="account-metric">
          <p className="account-metric__label">Available</p>
          <p className="account-metric__value">
            {formatMoney(earnings.availableMinor, earnings.currency)}
          </p>
        </div>
        <div className="account-metric">
          <p className="account-metric__label">Total earned</p>
          <p className="account-metric__value">
            {formatMoney(earnings.lifetimeNetMinor, earnings.currency)}
          </p>
        </div>
        <div className="account-metric">
          <p className="account-metric__label">Gross sales</p>
          <p className="account-metric__value">
            {formatMoney(earnings.grossSalesMinor, earnings.currency)}
          </p>
        </div>
        <div className="account-metric">
          <p className="account-metric__label">Paid out</p>
          <p className="account-metric__value">
            {formatMoney(earnings.paidOutMinor, earnings.currency)}
          </p>
        </div>
        <div className="account-metric">
          <p className="account-metric__label">Commission</p>
          <p className="account-metric__value">{commissionPct}%</p>
        </div>
        <div className="account-metric">
          <p className="account-metric__label">Orders</p>
          <p className="account-metric__value">
            {earnings.deliveredCount}/{earnings.orderCount}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <Button asChild href={`/vendor/payouts${q}`} variant="accent" size="sm">
          Request payout
        </Button>
      </div>

      <section className="account-panel">
        <div className="account-panel__head">
          <h2 className="account-panel__title">Ledger</h2>
        </div>
        {ledger.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            No settlements yet. Delivered sales credit this wallet automatically.
          </p>
        ) : (
          ledger.map((row) => (
            <div key={row.id} className="account-order">
              <div>
                <p className="account-order__id">
                  {row.reason.replaceAll("_", " ")}
                </p>
                <p className="account-order__meta" suppressHydrationWarning>
                  {row.createdAt.toLocaleString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}
                </p>
              </div>
              <p
                className={`font-semibold tabular-nums ${
                  row.deltaMinor < 0 ? "text-[var(--color-danger)]" : ""
                }`}
              >
                {row.deltaMinor < 0 ? "−" : "+"}
                {formatMoney(Math.abs(row.deltaMinor), wallet.currency)}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
