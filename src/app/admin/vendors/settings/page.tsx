import { revalidatePath } from "next/cache";
import { SectionHeader } from "@/components/dashboard/section-header";
import { VendorTabs } from "@/components/dashboard/vendor-tabs";
import { RentPayForm } from "@/components/forms/rent-pay-form";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettlementAccounts } from "@/lib/payments/settlement";
import { getVendorRental } from "@/services/rentals";
import { ensureUserWorkspace } from "@/services/workspace";

async function updateStorefrontAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return;

  const vendorId = String(formData.get("vendorId") ?? "");
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return;

  await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      storeName: String(formData.get("storeName") ?? vendor.storeName),
      description: String(formData.get("description") || "") || null,
      contactEmail: String(formData.get("contactEmail") || "") || null,
      contactPhone: String(formData.get("contactPhone") || "") || null,
    },
  });
  revalidatePath("/admin/vendors/settings");
  revalidatePath(`/vendors/${vendor.slug}`);
}

export default async function AdminVendorSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSessionUser();
  const user = await ensureUserWorkspace(session!);
  const sp = await searchParams;
  const requestedId =
    typeof sp.vendorId === "string" ? sp.vendorId : undefined;

  const vendors = await prisma.vendor.findMany({
    orderBy: { storeName: "asc" },
    select: {
      id: true,
      storeName: true,
      slug: true,
      status: true,
      description: true,
      contactEmail: true,
      contactPhone: true,
    },
  });

  const vendor =
    vendors.find((v) => v.id === requestedId) ||
    vendors.find((v) => v.id === user.vendor?.id) ||
    vendors[0] ||
    null;

  const rental = vendor
    ? await getVendorRental(session, vendor.id).catch(() => null)
    : null;

  const payments =
    rental != null
      ? await prisma.rentalPayment.findMany({
          where: { rentalId: rental.id },
          orderBy: { createdAt: "desc" },
          take: 12,
        })
      : [];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Vendor"
        description="Storefront details and monthly rental for each shop."
        userName={user.name}
      />
      <VendorTabs />

      {vendors.length === 0 ? (
        <div className="card space-y-4 p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No vendor shops yet. Sellers apply from the public sell page.
          </p>
          <Button asChild href="/vendor/apply" variant="accent">
            View apply form
          </Button>
        </div>
      ) : (
        <>
          <nav
            className="flex flex-wrap gap-2"
            aria-label="Select vendor shop"
          >
            {vendors.map((v) => (
              <Button
                key={v.id}
                asChild
                href={`/admin/vendors/settings?vendorId=${v.id}`}
                variant={v.id === vendor?.id ? "primary" : "ghost"}
                size="sm"
              >
                {v.storeName}
              </Button>
            ))}
          </nav>

          {vendor ? (
            <>
              <form
                action={updateStorefrontAction}
                className="card max-w-2xl space-y-4 p-6"
              >
                <input type="hidden" name="vendorId" value={vendor.id} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="type-h2 !text-2xl">Store settings</h2>
                  <Badge tone="info">{vendor.status}</Badge>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Public URL: /vendors/{vendor.slug}
                </p>
                <div>
                  <Label htmlFor="storeName">Store name</Label>
                  <Input
                    id="storeName"
                    name="storeName"
                    defaultValue={vendor.storeName}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={vendor.description ?? ""}
                    rows={4}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="contactEmail">Contact email</Label>
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      defaultValue={vendor.contactEmail ?? ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Contact phone</Label>
                    <Input
                      id="contactPhone"
                      name="contactPhone"
                      defaultValue={vendor.contactPhone ?? ""}
                    />
                  </div>
                </div>
                <div className="button-group justify-start">
                  <Button type="submit">Save storefront</Button>
                  <Button
                    asChild
                    href={`/vendors/${vendor.slug}`}
                    variant="ghost"
                  >
                    Public storefront
                  </Button>
                </div>
              </form>

              <section className="card max-w-2xl space-y-4 p-6">
                <h2
                  className="text-2xl"
                >
                  Monthly rental
                </h2>
                {!rental ? (
                  <Alert tone="warning">
                    No rental subscription found for this shop.
                  </Alert>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{rental.plan.name}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          {formatMoney(
                            rental.plan.monthlyPriceMinor,
                            rental.plan.currency,
                          )}{" "}
                          / month · up to {rental.plan.maxProducts} products
                        </p>
                      </div>
                      <Badge
                        tone={
                          rental.status === "ACTIVE" ||
                          rental.status === "TRIAL"
                            ? "success"
                            : "warning"
                        }
                      >
                        {rental.status}
                      </Badge>
                    </div>
                    <p
                      className="text-sm text-[var(--color-text-muted)]"
                      suppressHydrationWarning
                    >
                      Current period:{" "}
                      {rental.currentPeriodStart.toLocaleDateString("en-NG", {
                        timeZone: "Africa/Lagos",
                      })}{" "}
                      →{" "}
                      {rental.currentPeriodEnd.toLocaleDateString("en-NG", {
                        timeZone: "Africa/Lagos",
                      })}
                    </p>
                    <Alert tone="info">
                      Pay rent by bank / fintech transfer to{" "}
                      {getSettlementAccounts()
                        .map((a) => `${a.bank} ${a.accountNumber}`)
                        .join(" · ")}
                      . Use the store name as the narration.
                    </Alert>
                    <RentPayForm />
                    <div>
                      <h3 className="mb-3 font-semibold">Recent payments</h3>
                      {payments.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-muted)]">
                          No payments yet.
                        </p>
                      ) : (
                        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
                          {payments.map((p) => (
                            <li
                              key={p.id}
                              className="flex justify-between gap-3 px-4 py-3 text-sm"
                              suppressHydrationWarning
                            >
                              <span>
                                {p.periodStart.toLocaleDateString("en-NG", {
                                  timeZone: "Africa/Lagos",
                                })}{" "}
                                –{" "}
                                {p.periodEnd.toLocaleDateString("en-NG", {
                                  timeZone: "Africa/Lagos",
                                })}
                              </span>
                              <span>
                                {formatMoney(p.amountMinor, p.currency)} ·{" "}
                                {p.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </section>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
