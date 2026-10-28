import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/db";
import { ensureVendorWallet } from "@/services/workspace";

export default async function VendorEarningsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/vendor/earnings");

  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
  if (!vendor) redirect("/vendor/apply");

  const wallet = await ensureVendorWallet(vendor.id);
  const ledger = await prisma.walletLedger.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const commissionPct = (vendor.commissionBps / 100).toFixed(1);

  return (
    <div>
      <header className="account-hero">
        <h1 className="account-hero__title">Earnings</h1>
        <p className="account-hero__lede">
          Net sales after {commissionPct}% platform commission settle into this
          wallet when payment is confirmed.
        </p>
      </header>

      <div className="account-metrics mb-4">
        <div className="account-metric">
          <p className="account-metric__label">Available</p>
          <p className="account-metric__value">
            {formatMoney(wallet.balanceMinor, wallet.currency)}
          </p>
        </div>
        <div className="account-metric">
          <p className="account-metric__label">Commission</p>
          <p className="account-metric__value">{commissionPct}%</p>
        </div>
      </div>

      <section className="account-panel">
        <div className="account-panel__head">
          <h2 className="account-panel__title">Ledger</h2>
        </div>
        {ledger.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            No settlements yet. Confirmed sales credit this wallet automatically.
          </p>
        ) : (
          ledger.map((row) => (
            <div key={row.id} className="account-order">
              <div>
                <p className="account-order__id">{row.reason.replaceAll("_", " ")}</p>
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
