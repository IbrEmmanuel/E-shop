import Link from "next/link";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import {
  getAudienceSegments,
  listCampaigns,
} from "@/services/advertising";

export default async function AdvertisingPage() {
  const session = await getSessionUser();
  const [campaigns, segments] = await Promise.all([
    listCampaigns(session),
    getAudienceSegments(session),
  ]);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Advertising"
        description="Campaigns, sponsored placements, and first-party audience aggregates."
        userName={session?.name}
        actions={
          <Button asChild href="/admin/advertising/new" variant="primary">
            New campaign
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Audience window
          </p>
          <p className="mt-1 text-2xl font-semibold">{segments.windowDays}d</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Cart adds</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {segments.cartAdditions}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Purchases</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {segments.purchases}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Marketing opt-ins
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {segments.marketingOptIns}
          </p>
        </div>
      </section>

      <p className="text-sm text-[var(--color-text-muted)]">
        Audience tiles use consented first-party activity only. Individual
        customer journeys are never exposed to vendors.
      </p>

      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns"
          description="Create a campaign, attach sponsored products or banners, then activate to record real events."
          action={
            <Button asChild href="/admin/advertising/new" variant="primary">
              Create campaign
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {campaigns.map((c) => (
            <li
              key={c.id}
              className="card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <Link
                  href={`/admin/advertising/${c.id}`}
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  {c.name}
                </Link>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {c.objective} · budget{" "}
                  {formatMoney(c.budgetMinor, c.currency)} · spent{" "}
                  {formatMoney(c.spentMinor, c.currency)}
                  {c.vendor ? ` · ${c.vendor.storeName}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="info">{c.status}</Badge>
                <span className="text-sm text-[var(--color-text-muted)]">
                  {c._count.creatives} creatives · {c._count.events} events
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
