import Link from "next/link";
import { redirect } from "next/navigation";
import { VendorApplyWizard } from "@/components/forms/vendor-apply-wizard";
import { Alert } from "@/components/ui/alert";
import { PublicShell } from "@/components/layout/public-shell";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { listActivePlans } from "@/services/rentals";
import {
  ensureDraftApplication,
  getOpenApplication,
} from "@/services/vendor-application";
import { getVendorByUserId } from "@/services/vendors";

export const metadata = buildMetadata({
  title: "Vendor application",
  path: "/vendor/apply",
  noIndex: true,
});

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function VendorApplyPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/vendor/apply");

  const existingVendor = await getVendorByUserId(user.id);
  if (existingVendor) redirect("/vendor");

  const sp = await searchParams;
  const submitted = sp.submitted === "1";
  const verified = sp.verified === "1";

  const [plans, categories, dbUser] = await Promise.all([
    listActivePlans().catch(() => []),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      take: 24,
      select: { id: true, name: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true, email: true },
    }),
  ]);

  let application = await getOpenApplication(user.id);
  if (!application) {
    application = await ensureDraftApplication(user);
  }

  return (
    <PublicShell>
      <div className="container-page max-w-2xl py-10 md:py-14">
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          <Link href="/sell">Sell on E-Shop</Link>
        </p>
        <h1 className="type-h1 mt-2">Seller application</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Complete each step, verify your email, upload documents, then submit
          for admin approval. After approval your vendor desk unlocks.
        </p>

        {submitted ? (
          <Alert tone="success" className="mt-6">
            Application submitted. We will email you when it is reviewed.
          </Alert>
        ) : null}
        {verified ? (
          <Alert tone="success" className="mt-6">
            Email verified. You can finish and submit.
          </Alert>
        ) : null}

        <div className="mt-8">
          <VendorApplyWizard
            plans={plans}
            categories={categories}
            emailVerified={Boolean(dbUser?.emailVerified)}
            defaultEmail={dbUser?.email || user.email}
            application={{
              id: application.id,
              status: application.status,
              reviewNotes: application.reviewNotes,
              wizardStep: application.wizardStep,
              storeName: application.storeName,
              businessName: application.businessName,
              businessType: application.businessType,
              description: application.description,
              contactEmail: application.contactEmail,
              contactPhone: application.contactPhone,
              website: application.website,
              businessAddress: application.businessAddress,
              businessCity: application.businessCity,
              businessState: application.businessState,
              businessCountry: application.businessCountry,
              logoUrl: application.logoUrl,
              bannerUrl: application.bannerUrl,
              categoryIdsJson: application.categoryIdsJson,
              shippingPolicy: application.shippingPolicy,
              returnsPolicy: application.returnsPolicy,
              processingDays: application.processingDays,
              taxId: application.taxId,
              payoutBankName: application.payoutBankName,
              payoutAccountName: application.payoutAccountName,
              payoutAccountNumber: application.payoutAccountNumber,
              rentalPlanId: application.rentalPlanId,
              documents: application.documents.map((d) => ({
                id: d.id,
                docType: d.docType,
                fileName: d.fileName,
                label: d.label,
              })),
            }}
          />
        </div>
      </div>
    </PublicShell>
  );
}
