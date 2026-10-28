import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import {
  ensureUserWorkspace,
  getPersonalOrderStats,
} from "@/services/workspace";

export default async function AccountOverviewPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const [workspace, stats] = await Promise.all([
    ensureUserWorkspace(session),
    getPersonalOrderStats(session.id),
  ]);

  const first = workspace.firstName || workspace.name?.split(" ")[0] || "there";
  const awaitingPay = stats.recent.filter((o) => o.status === "PENDING_PAYMENT");

  return (
    <div>
      <header className="account-hero">
        <h1 className="account-hero__title">Hello, {first}</h1>
        <p className="account-hero__lede">
          Your orders, saved pieces, and delivery details — in one place.
        </p>
      </header>

      <div className="account-metrics">
        <div className="account-metric">
          <p className="account-metric__label">Orders</p>
          <p className="account-metric__value">{stats.totalOrders}</p>
        </div>
        <div className="account-metric">
          <p className="account-metric__label">In progress</p>
          <p className="account-metric__value">{stats.pendingOrders}</p>
        </div>
        <div className="account-metric">
          <p className="account-metric__label">Spent</p>
          <p className="account-metric__value">
            {formatMoney(stats.totalSpentMinor, stats.currency)}
          </p>
        </div>
      </div>

      {awaitingPay.length > 0 ? (
        <div className="account-panel mb-4">
          <div className="account-panel__head">
            <h2 className="account-panel__title">Awaiting payment</h2>
          </div>
          {awaitingPay.map((o) => (
            <div key={o.id} className="account-order">
              <div>
                <p className="account-order__id">{o.orderNumber}</p>
                <p className="account-order__meta">
                  {formatMoney(o.totalMinor, o.currency)} due
                </p>
              </div>
              <Button
                asChild
                href={`/account/orders/${o.orderNumber}`}
                variant="primary"
                size="sm"
              >
                Pay now
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <section className="account-panel">
        <div className="account-panel__head">
          <h2 className="account-panel__title">Recent orders</h2>
          <Link
            href="/account/orders"
            className="text-sm font-semibold text-[var(--color-primary)]"
          >
            View all
          </Link>
        </div>
        {stats.recent.length === 0 ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-[var(--color-text-secondary)]">
              No orders yet.
            </p>
            <Button asChild href="/shop" variant="accent" size="sm">
              Browse the shop
            </Button>
          </div>
        ) : (
          stats.recent.map((o) => (
            <div key={o.id} className="account-order">
              <div>
                <Link
                  href={`/account/orders/${o.orderNumber}`}
                  className="account-order__id hover:underline"
                >
                  {o.orderNumber}
                </Link>
                <p className="account-order__meta" suppressHydrationWarning>
                  {o.createdAt.toLocaleDateString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}
                </p>
              </div>
              <div className="text-right">
                <Badge tone="info">{o.status.replaceAll("_", " ")}</Badge>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatMoney(o.totalMinor, o.currency)}
                </p>
              </div>
            </div>
          ))
        )}
      </section>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild href="/account/saved" variant="outline" size="sm">
          Saved items ({workspace.favourites.length})
        </Button>
        <Button asChild href="/account/addresses" variant="outline" size="sm">
          Addresses ({workspace.addresses.length})
        </Button>
        <Button asChild href="/account/profile" variant="ghost" size="sm">
          Edit profile
        </Button>
      </div>
    </div>
  );
}
