import { redirect } from "next/navigation";
import { VendorApplyForm } from "@/components/forms/vendor-apply-form";
import { Alert } from "@/components/ui/alert";
import { PublicShell } from "@/components/layout/public-shell";
import { getSessionUser } from "@/lib/auth";
import { buildMetadata } from "@/lib/seo";
import { listActivePlans } from "@/services/rentals";
import { getVendorByUserId } from "@/services/vendors";
import { prisma } from "@/lib/db";

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

  const existing = await getVendorByUserId(user.id);
  if (existing) redirect("/sell");

  const sp = await searchParams;
  const submitted = sp.submitted === "1";
  const defaultPlanId = typeof sp.plan === "string" ? sp.plan : undefined;

  const [plans, pending] = await Promise.all([
    listActivePlans().catch(() => []),
    prisma.vendorApplication.findFirst({
      where: {
        userId: user.id,
        status: { in: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] },
      },
    }),
  ]);

  return (
    <PublicShell>
      <div className="container-page max-w-xl py-10 md:py-14">
        <h1
          className="type-h1"
        >
          Apply to sell
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Choose a monthly rental plan. An admin will review your application.
        </p>
        {submitted || pending ? (
          <Alert tone="success" className="mt-6">
            Your application is submitted
            {pending ? ` (${pending.status.replaceAll("_", " ")})` : ""}. We will
            email you when it is reviewed.
          </Alert>
        ) : plans.length === 0 ? (
          <Alert tone="warning" className="mt-6">
            No active rental plans. Please check back after plans are configured.
          </Alert>
        ) : (
          <div className="mt-8">
            <VendorApplyForm
              plans={plans}
              defaultPlanId={defaultPlanId}
              defaultEmail={user.email}
            />
          </div>
        )}
      </div>
    </PublicShell>
  );
}
