import { listActivePlans } from "@/services/rentals";
import { formatMoney } from "@/lib/money";
import { buildMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = buildMetadata({
  title: "Sell on E-Shop",
  description: "Rent a shop monthly and sell on E-Shop.",
  path: "/sell",
});

export default async function SellPage() {
  const plans = await listActivePlans().catch(() => []);

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
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild href="/vendor/apply" variant="accent" size="lg">
                Apply to sell
              </Button>
              <Button asChild href="/vendor" variant="outline" size="lg">
                Vendor desk
              </Button>
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
              return (
                <article
                  key={plan.id}
                  className="card flex flex-col p-6 transition-[box-shadow,border-color] duration-[var(--transition-speed)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)]"
                >
                  <h3 className="type-h2 !text-xl">{plan.name}</h3>
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
                    <li>{plan.maxProducts} products</li>
                    <li>{plan.trialDays}-day trial</li>
                    {features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    href={`/vendor/apply?plan=${plan.id}`}
                    variant="accent"
                    className="mt-6"
                  >
                    Choose {plan.name}
                  </Button>
                </article>
              );
            })}
          </div>
        )}
        <p className="mt-10 text-sm text-[var(--color-soft-muted)]">
          Already applied? We email you when your shop is reviewed. Catalog ops
          are handled from the platform admin console.
        </p>
      </section>
    </div>
  );
}
