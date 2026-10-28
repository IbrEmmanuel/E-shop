import { redirect } from "next/navigation";
import { PayoutRequestForm } from "@/components/forms/payout-request-form";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/db";
import { ensureVendorWallet } from "@/services/workspace";

export default async function VendorPayoutsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/vendor/payouts");

  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
  if (!vendor) redirect("/vendor/apply");

  const wallet = await ensureVendorWallet(vendor.id);
  const payouts = await prisma.payoutRequest.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div>
      <header className="account-hero">
        <h1 className="account-hero__title">Payouts</h1>
        <p className="account-hero__lede">
          Request a transfer from your available balance (
          {formatMoney(wallet.balanceMinor, wallet.currency)}). Admin confirms
          after bank transfer.
        </p>
      </header>

      <section className="account-panel mb-4">
        <div className="account-panel__head">
          <h2 className="account-panel__title">Request payout</h2>
        </div>
        <PayoutRequestForm maxMinor={wallet.balanceMinor} />
      </section>

      <section className="account-panel">
        <div className="account-panel__head">
          <h2 className="account-panel__title">History</h2>
        </div>
        {payouts.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            No payout requests yet.
          </p>
        ) : (
          payouts.map((p) => (
            <div key={p.id} className="account-order">
              <div>
                <p className="account-order__id">
                  {formatMoney(p.amountMinor, p.currency)}
                </p>
                <p className="account-order__meta">
                  {p.bankName} · {p.accountName} · {p.accountNumber}
                </p>
              </div>
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
            </div>
          ))
        )}
      </section>
    </div>
  );
}
