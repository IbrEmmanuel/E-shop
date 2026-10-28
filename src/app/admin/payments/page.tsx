import Link from "next/link";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/db";

export default async function AdminPaymentsInvestigationPage() {
  const session = await getSessionUser();

  const flagged = await prisma.payment.findMany({
    where: { investigationStatus: "OPEN" },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      order: {
        select: {
          orderNumber: true,
          totalMinor: true,
          currency: true,
          status: true,
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Payment investigations"
        description="Amount, currency, or reference mismatches awaiting reconciliation."
        userName={session?.name}
      />

      {flagged.length === 0 ? (
        <EmptyState
          title="No open investigations"
          description="Mismatched bank proofs appear here when approve fails verification."
        />
      ) : (
        <ul className="space-y-3">
          {flagged.map((p) => (
            <li key={p.id} className="card space-y-2 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.order.orderNumber}</p>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {p.investigationNote}
                  </p>
                  <p className="mt-1 text-sm tabular-nums">
                    Payment {formatMoney(p.amountMinor, p.currency)} · Order{" "}
                    {formatMoney(p.order.totalMinor, p.order.currency)}
                  </p>
                </div>
                <Badge tone="warning">OPEN</Badge>
              </div>
              <Link
                href="/admin/orders"
                className="text-sm font-semibold text-[var(--color-primary)]"
              >
                Review in orders →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
