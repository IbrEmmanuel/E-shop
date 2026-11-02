import { redirect } from "next/navigation";
import { PayoutRequestForm } from "@/components/forms/payout-request-form";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { isStaffRole } from "@/lib/roles";
import { resolveVendorDesk } from "@/lib/vendor-desk";
import { prisma } from "@/lib/db";
import { ensureVendorWallet } from "@/services/workspace";

export default async function VendorPayoutsPage({
  searchParams,
}: {
  searchParams?: Promise<{ vendorId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/vendor/payouts");

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

  const wallet = await ensureVendorWallet(vendor.id);
  const payouts = await prisma.payoutRequest.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div>
      <header className="account-hero">
        {inspecting ? (
          <Badge tone="warning" className="mb-2">
            Inspecting as admin
          </Badge>
        ) : null}
        <h1 className="account-hero__title">Payouts</h1>
        <p className="account-hero__lede">
          Withdraw from your available balance (
          {formatMoney(wallet.balanceMinor, wallet.currency)}). Admin confirms
          after bank transfer.
        </p>
      </header>

      {!inspecting ? (
        <section className="account-panel mb-4">
          <div className="account-panel__head">
            <h2 className="account-panel__title">Request payout</h2>
          </div>
          <PayoutRequestForm maxMinor={wallet.balanceMinor} />
        </section>
      ) : (
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          Payout requests are disabled while inspecting.
        </p>
      )}

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
                <p className="account-order__meta" suppressHydrationWarning>
                  {p.createdAt.toLocaleString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}
                  {p.accountName ? ` · ${p.accountName}` : ""}
                </p>
              </div>
              <Badge
                tone={
                  p.status === "APPROVED" || p.status === "PAID"
                    ? "success"
                    : p.status === "REJECTED"
                      ? "danger"
                      : "warning"
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
