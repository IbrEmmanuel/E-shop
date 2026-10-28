import { SectionHeader } from "@/components/dashboard/section-header";
import { VendorTabs } from "@/components/dashboard/vendor-tabs";
import { ReviewPayoutButtons } from "@/components/vendor/review-payout-buttons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/db";

export default async function AdminVendorPayoutsPage() {
  const session = await getSessionUser();
  const payouts = await prisma.payoutRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      vendor: { select: { storeName: true, slug: true } },
    },
  });

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Vendor"
        description="Approve payout requests and debit vendor wallets."
        userName={session?.name}
      />
      <VendorTabs />

      {payouts.length === 0 ? (
        <EmptyState
          title="No payout requests"
          description="Vendors submit payouts from /vendor/payouts after sales settle."
        />
      ) : (
        <ul className="space-y-3">
          {payouts.map((p) => (
            <li
              key={p.id}
              className="card flex flex-wrap items-start justify-between gap-4 p-5"
            >
              <div>
                <p className="font-semibold">{p.vendor.storeName}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatMoney(p.amountMinor, p.currency)}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {p.bankName} · {p.accountName} · {p.accountNumber}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]" suppressHydrationWarning>
                  {p.createdAt.toLocaleString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge
                  tone={
                    p.status === "APPROVED"
                      ? "success"
                      : p.status === "REJECTED"
                        ? "danger"
                        : "info"
                  }
                >
                  {p.status}
                </Badge>
                {p.status === "PENDING" ? (
                  <ReviewPayoutButtons payoutId={p.id} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
