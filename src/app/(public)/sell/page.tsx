import { listActivePlans } from "@/services/rentals";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { isStaffRole } from "@/lib/roles";
import { buildMetadata } from "@/lib/seo";
import { getOpenApplication } from "@/services/vendor-application";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

export const metadata = buildMetadata({
  title: "Sell on E-Shop",
  description: "Rent a shop monthly and sell on E-Shop.",
  path: "/sell",
});

export default async function SellPage() {
  const [plans, user] = await Promise.all([
    listActivePlans().catch(() => []),
    getSessionUser(),
  ]);

  const vendor = user
    ? await prisma.vendor.findUnique({
        where: { userId: user.id },
        include: { rental: { select: { planId: true } } },
      })
    : null;
  const application =
    user && !vendor ? await getOpenApplication(user.id) : null;

  const isVendor = Boolean(vendor) || user?.role === "VENDOR";
  const isStaff = user ? isStaffRole(user.role) : false;
  const appStatus = application?.status ?? null;
  const appPending =
    appStatus === "SUBMITTED" ||
    appStatus === "UNDER_REVIEW" ||
    appStatus === "CHANGES_REQUESTED";
  const appDraft =
    appStatus === "DRAFT" || appStatus === "REJECTED" || appStatus === null;

  let primaryHref = "/vendor/apply";
  let primaryLabel = "Apply to sell";
  let secondaryHref: string | null = "/login?callbackUrl=%2Fvendor";
  let secondaryLabel: string | null = "Sign in to vendor desk";
  let statusNote: string | null = null;

  if (!user) {
    primaryHref = `/login?callbackUrl=${encodeURIComponent("/vendor/apply")}`;
    primaryLabel = "Apply to sell";
    secondaryHref = `/register?callbackUrl=${encodeURIComponent("/vendor/apply")}`;
    secondaryLabel = "Create seller account";
  } else if (isStaff && !vendor) {
    primaryHref = "/admin/vendors";
    primaryLabel = "Review applications";
    secondaryHref = "/vendor";
    secondaryLabel = "Inspect vendor desk";
  } else if (isVendor || vendor) {
    primaryHref = "/vendor";
    primaryLabel = "Open vendor desk";
    secondaryHref = "/vendor/products/new";
    secondaryLabel = "Add a product";
    statusNote = vendor
      ? `Your shop “${vendor.storeName}” is live.`
      : "Your vendor desk is ready.";
  } else if (appPending) {
    primaryHref = "/vendor/apply";
    primaryLabel = "View application status";
    secondaryHref = null;
    secondaryLabel = null;
    statusNote = `Application ${appStatus?.toLowerCase().replaceAll("_", " ")}. We’ll email you when it’s reviewed.`;
  } else if (application && appDraft) {
    primaryHref = "/vendor/apply";
    primaryLabel = "Continue application";
    secondaryHref = null;
    secondaryLabel = null;
    statusNote =
      appStatus === "REJECTED"
        ? "Your last application needs updates — continue below."
        : "You have a draft application in progress.";
  } else {
    primaryHref = "/vendor/apply";
    primaryLabel = "Apply to sell";
    secondaryHref = null;
    secondaryLabel = null;
  }

  const planCtaHref = (planId: string) => {
    if (isVendor || vendor) return "/vendor";
    if (isStaff && !vendor) return "/admin/vendors";
    const apply = `/vendor/apply?plan=${planId}`;
    if (!user) {
      return `/login?callbackUrl=${encodeURIComponent(apply)}`;
    }
    return apply;
  };

  const planCtaLabel = (name: string) => {
    if (isVendor || vendor) return "Open desk";
    if (appPending) return "View status";
    if (application && appDraft) return `Continue with ${name}`;
    return `Choose ${name}`;
  };

  return (
    <div>
      <section className="border-b border-[var(--glass-border)]">
        <div className="container-page grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <p className="type-h1 text-[var(--color-primary)] !text-[clamp(2.2rem,4vw,3.5rem)]">
              Sell on E-Shop
            </p>
            <h1 className="type-h2 mt-4 !text-[clamp(1.35rem,2.5vw,1.85rem)]">
              Rent a shop. Pay monthly. Publish your catalog.
            </h1>
            <p className="type-body mt-4 max-w-md">
              Create an account, verify your email, complete business KYC and
              store setup, then submit for admin approval. After approval, list
              products, fulfil orders, and request payouts from your vendor desk.
            </p>
            {statusNote ? (
              <Alert tone="info" className="mt-6 max-w-md">
                {statusNote}
              </Alert>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild href={primaryHref} variant="accent" size="lg">
                {primaryLabel}
              </Button>
              {secondaryHref && secondaryLabel ? (
                <Button asChild href={secondaryHref} variant="outline" size="lg">
                  {secondaryLabel}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="card min-h-[16rem] p-8">
            <Badge tone="accent">Monthly rental</Badge>
            <p className="type-h2 mt-5 !text-[1.75rem]">
              Your storefront, on a schedule you can budget.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-[var(--color-soft)]">
              <li>Trial days on every plan</li>
              <li>Product caps matched to your size</li>
              <li>CSV imports and order desk included</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <h2 className="type-h2">Plans</h2>
        {plans.length === 0 ? (
          <p className="mt-4 text-[var(--color-soft-muted)]">
            Seller plans are being prepared. Contact support if you need early
            access, or check back soon.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {plans.map((plan) => {
              let features: string[] = [];
              try {
                features = JSON.parse(plan.featuresJson) as string[];
              } catch {
                features = [];
              }
              const selected =
                application?.rentalPlanId === plan.id ||
                vendor?.rental?.planId === plan.id;
              return (
                <article
                  key={plan.id}
                  className="card flex flex-col p-6 transition-[box-shadow,border-color] duration-[var(--transition-speed)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="type-h2 !text-xl">{plan.name}</h3>
                    {selected ? <Badge tone="success">Selected</Badge> : null}
                  </div>
                  <p className="mt-3 text-3xl font-medium tabular-nums text-[var(--text-primary)]">
                    {formatMoney(plan.monthlyPriceMinor, plan.currency)}
                    <span className="text-sm font-normal text-[var(--text-muted)]">
                      /mo
                    </span>
                  </p>
                  {plan.description ? (
                    <p className="mt-3 text-sm text-[var(--color-soft)]">
                      {plan.description}
                    </p>
                  ) : null}
                  <ul className="mt-4 flex-1 space-y-1.5 text-sm text-[var(--color-soft)]">
                    <li>
                      Up to {plan.maxProducts.toLocaleString("en-NG")} products
                    </li>
                    <li>{plan.trialDays}-day trial</li>
                    {features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    href={planCtaHref(plan.id)}
                    variant="accent"
                    className="mt-6"
                  >
                    {planCtaLabel(plan.name)}
                  </Button>
                </article>
              );
            })}
          </div>
        )}
        <p className="mt-10 text-sm text-[var(--color-soft-muted)]">
          {appPending
            ? "We’ll email you when your shop application is reviewed."
            : isVendor || vendor
              ? "Manage catalog, orders, rent, and payouts from your vendor desk."
              : "Already applied? Continue from Apply to sell — we’ll email you when your shop is reviewed."}
        </p>
      </section>
    </div>
  );
}
