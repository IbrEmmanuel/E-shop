import { SectionHeader } from "@/components/dashboard/section-header";
import { VendorTabs } from "@/components/dashboard/vendor-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import {
  ensureUserWorkspace,
  ensureVendorWallet,
} from "@/services/workspace";
import { prisma } from "@/lib/db";

export default async function VendorWalletPage() {
  const session = await getSessionUser();
  const user = await ensureUserWorkspace(session!);

  if (!user.vendor) {
    return (
      <div className="space-y-8">
        <SectionHeader
          title="Vendor"
          description="Products, bulk import, orders, and wallet."
          userName={user.name}
        />
        <VendorTabs />
        <EmptyState
          title="Wallet unavailable"
          description="Create a vendor storefront to unlock payout wallet tracking."
        />
      </div>
    );
  }

  const wallet = await ensureVendorWallet(user.vendor.id);
  const ledger = await prisma.walletLedger.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Vendor"
        description="Products, bulk import, orders, and wallet."
        userName={user.name}
      />
      <VendorTabs />

      <div className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Available balance
        </p>
        <p className="type-h1 mt-3 font-semibold tabular-nums">
          {formatMoney(wallet.balanceMinor, wallet.currency)}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Ledger entries are created from verified sales settlements — never
          simulated payouts.
        </p>
      </div>

      <section className="space-y-3">
        <h2
          className="text-xl"
        >
          Ledger
        </h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No wallet movements yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {ledger.map((row) => (
              <li
                key={row.id}
                className="card flex items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium">{row.reason}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {row.createdAt.toLocaleString()}
                  </p>
                </div>
                <p className="font-semibold tabular-nums">
                  {row.deltaMinor >= 0 ? "+" : ""}
                  {formatMoney(row.deltaMinor, wallet.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
