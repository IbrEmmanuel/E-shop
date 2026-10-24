import { notFound } from "next/navigation";
import { setCampaignStatusAction } from "@/app/actions/advertising";
import { SectionHeader } from "@/components/dashboard/section-header";
import { AddCreativeForm } from "@/components/forms/add-creative-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/db";
import {
  getCampaign,
  getCampaignMetrics,
} from "@/services/advertising";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CampaignDetailPage({
  params,
  searchParams,
}: Props) {
  const session = await getSessionUser();
  const { id } = await params;
  const sp = await searchParams;
  const from =
    typeof sp.from === "string" && sp.from ? new Date(sp.from) : undefined;
  const to = typeof sp.to === "string" && sp.to ? new Date(sp.to) : undefined;

  let campaign;
  let metrics;
  try {
    [campaign, metrics] = await Promise.all([
      getCampaign(session, id),
      getCampaignMetrics(session, id, { from, to }),
    ]);
  } catch {
    notFound();
  }

  const products = await prisma.product.findMany({
    where: {
      status: { in: ["PUBLISHED", "PENDING_REVIEW", "DRAFT"] },
      ...(campaign.vendorId ? { vendorId: campaign.vendorId } : {}),
    },
    orderBy: { title: "asc" },
    select: { id: true, title: true, sku: true },
    take: 200,
  });

  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

  return (
    <div className="space-y-8">
      <SectionHeader
        title={campaign.name}
        description={`${campaign.objective} · ${campaign.vendor?.storeName ?? "Platform"}`}
        userName={session?.name}
        actions={<Badge tone="info">{campaign.status}</Badge>}
      />

      <form
        action={setCampaignStatusAction}
        className="flex flex-wrap gap-2"
      >
        <input type="hidden" name="campaignId" value={campaign.id} />
        {(
          [
            ["PENDING_APPROVAL", "Submit for approval"],
            ["APPROVED", "Approve"],
            ["ACTIVE", "Activate"],
            ["PAUSED", "Pause"],
            ["ARCHIVED", "Archive"],
          ] as const
        ).map(([status, label]) => (
          <Button
            key={status}
            type="submit"
            name="status"
            value={status}
            size="sm"
            variant={status === "ACTIVE" ? "accent" : "outline"}
          >
            {label}
          </Button>
        ))}
      </form>

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-sm text-[var(--color-text-muted)]" htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={typeof sp.from === "string" ? sp.from : ""}
            className="input"
          />
        </div>
        <div>
          <label className="text-sm text-[var(--color-text-muted)]" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={typeof sp.to === "string" ? sp.to : ""}
            className="input"
          />
        </div>
        <Button type="submit" size="sm" variant="primary">
          Filter metrics
        </Button>
      </form>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Impressions", value: String(metrics.impressions) },
          { label: "Clicks", value: String(metrics.clicks) },
          { label: "CTR", value: pct(metrics.ctr) },
          {
            label: "Conversions",
            value: String(metrics.conversions),
          },
          {
            label: "Conv. rate",
            value: pct(metrics.conversionRate),
          },
          {
            label: "Spend",
            value: formatMoney(metrics.spendMinor, campaign.currency),
          },
          {
            label: "CPC",
            value:
              metrics.cpc != null
                ? formatMoney(Math.round(metrics.cpc), campaign.currency)
                : "—",
          },
          {
            label: "CPA",
            value:
              metrics.cpa != null
                ? formatMoney(Math.round(metrics.cpa), campaign.currency)
                : "—",
          },
          {
            label: "Attributed revenue",
            value: formatMoney(metrics.revenueMinor, campaign.currency),
          },
          {
            label: "ROAS",
            value: metrics.roas != null ? metrics.roas.toFixed(2) : "—",
          },
          {
            label: "Budget",
            value: formatMoney(campaign.budgetMinor, campaign.currency),
          },
        ].map((tile) => (
          <div key={tile.label} className="card p-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              {tile.label}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {tile.value}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2
          className="text-2xl"
        >
          Creatives
        </h2>
        {campaign.creatives.length === 0 ? (
          <p className="text-[var(--color-text-secondary)]">
            No creatives yet. Add a sponsored product or banner below.
          </p>
        ) : (
          <ul className="space-y-2">
            {campaign.creatives.map((c) => (
              <li key={c.id} className="card p-4 text-sm">
                <p className="font-semibold">
                  {c.title}{" "}
                  <Badge tone="info">{c.type}</Badge>{" "}
                  <Badge tone="info">{c.status}</Badge>
                </p>
                <p className="text-[var(--color-text-muted)]">
                  {c.product
                    ? `${c.product.title} (${c.product.sku})`
                    : c.linkUrl || "Banner"}
                </p>
              </li>
            ))}
          </ul>
        )}
        <AddCreativeForm campaignId={campaign.id} products={products} />
      </section>
    </div>
  );
}
