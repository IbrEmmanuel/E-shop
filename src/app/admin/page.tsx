import Link from "next/link";
import {
  ShoppingBag,
  CalendarClock,
  MessageCircle,
  Store,
  UserRound,
  Sparkles,
  Package,
  Settings,
  ArrowUpRight,
  TrendingUp,
  Boxes,
  ClipboardList,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHead } from "@/components/layout/section-head";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getAdminHomeMetrics } from "@/services/admin";
import { getPersonalOrderStats } from "@/services/workspace";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/components/ui/badge";

function statusTone(status: string): BadgeTone {
  if (status === "DELIVERED" || status === "PAID" || status === "SHIPPED") {
    return "success";
  }
  if (status === "PENDING_PAYMENT" || status === "PROCESSING") {
    return "warning";
  }
  if (status === "CANCELLED" || status === "REFUNDED") {
    return "danger";
  }
  return "info";
}

export default async function AdminDashboardPage() {
  const session = await getSessionUser();
  const userId = session!.id;
  const first = (session!.name || "User").split(/\s+/)[0];

  const [stats, platform] = await Promise.all([
    getPersonalOrderStats(userId),
    getAdminHomeMetrics(session),
  ]);

  const platformSecondary = [
    {
      label: "Paid orders",
      value: String(platform.orders.paid),
      icon: Package,
    },
    {
      label: "Published SKUs",
      value: String(platform.products.published),
      icon: Boxes,
    },
    {
      label: "Active vendors",
      value: String(platform.vendors.active),
      icon: Store,
    },
    {
      label: "Pending review",
      value: String(platform.products.pendingReview),
      icon: ClipboardList,
    },
    {
      label: "Open applications",
      value: String(platform.vendors.applicationsOpen),
      icon: Users,
    },
  ];

  const accountTiles = [
    { label: "Your orders", value: String(stats.totalOrders) },
    { label: "Pending", value: String(stats.pendingOrders) },
    {
      label: "Your spend",
      value: formatMoney(stats.totalSpentMinor, stats.currency),
      accent: true,
    },
  ];

  const shortcuts = [
    {
      href: "/admin/orders",
      title: "Orders",
      subtitle: "Payments & fulfillment",
      icon: Package,
    },
    {
      href: "/admin/marketplace",
      title: "Marketplace",
      subtitle: "Live catalog",
      icon: ShoppingBag,
    },
    {
      href: "/admin/vendors",
      title: "Vendor",
      subtitle: "Products, orders, wallet",
      icon: Store,
    },
    {
      href: "/admin/advertising",
      title: "Advertising",
      subtitle: "Campaigns & ROAS",
      icon: Sparkles,
    },
    {
      href: "/admin/consultations",
      title: "Consultations",
      subtitle: "Seller success",
      icon: MessageCircle,
    },
    {
      href: "/admin/consultations?tab=book",
      title: "Book a slot",
      subtitle: "Calendar",
      icon: CalendarClock,
    },
    {
      href: "/admin/profile",
      title: "Profile",
      subtitle: "Referrals & prefs",
      icon: UserRound,
    },
    {
      href: "/admin/settings",
      title: "Settings",
      subtitle: "Email & storage",
      icon: Settings,
    },
  ];

  return (
    <div className="admin-dash">
      <header className="admin-hero">
        <div className="admin-hero__glow" aria-hidden />
        <div className="admin-hero__inner">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="accent">Operations · live</Badge>
            </div>
            <h1 className="type-h2">Welcome back, {first}</h1>
            <p className="type-body mt-3 max-w-xl">
              Live marketplace metrics, vendor fulfillment, and storefront
              controls — all from one console.
            </p>
          </div>
          <div className="button-group button-group--stack-mobile justify-end admin-hero__actions">
            <Button asChild href="/admin/marketplace" variant="accent">
              Marketplace
            </Button>
            <Button asChild href="/admin/vendors" variant="outline">
              Vendors
            </Button>
          </div>
        </div>
      </header>

      <section className="admin-block">
        <SectionHead
          title="Platform"
          lede="Paid volume, catalog health, and seller activity from the live database."
        />

        <div className="admin-gmv">
          <div className="admin-gmv__copy">
            <p className="admin-gmv__label">
              <TrendingUp size={14} strokeWidth={1.75} aria-hidden />
              GMV (paid)
            </p>
            <p className="admin-gmv__value">
              {formatMoney(platform.orders.revenueMinor, "NGN")}
            </p>
            <p className="admin-gmv__hint">
              Settled marketplace volume across paid and fulfilled orders.
            </p>
          </div>
          <div className="admin-gmv__orb" aria-hidden />
        </div>

        <div className="metric-grid metric-grid--platform">
          {platformSecondary.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="metric-card metric-card--rich">
                <span className="metric-card__icon">
                  <Icon size={16} strokeWidth={1.7} />
                </span>
                <p className="metric-card__label">{t.label}</p>
                <p className="metric-card__value">{t.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="admin-block">
        <SectionHead
          title="Your account"
          lede="Orders and spend tied to this signed-in admin profile."
        />
        <div className="admin-account-strip">
          {accountTiles.map((t) => (
            <div
              key={t.label}
              className={cn(
                "admin-account-tile",
                t.accent && "admin-account-tile--accent",
              )}
            >
              <p className="metric-card__label">{t.label}</p>
              <p className="metric-card__value">{t.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-block">
        <SectionHead
          title="Quick links"
          lede="Jump to the same sections available in the admin sidebar."
        />
        <div className="shortcut-grid">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.title}
                href={s.href}
                className="admin-shortcut"
                prefetch
              >
                <span className="admin-shortcut__icon">
                  <Icon size={18} strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <p className="admin-shortcut__title">{s.title}</p>
                  <p className="admin-shortcut__sub">{s.subtitle}</p>
                </span>
                <ArrowUpRight
                  size={16}
                  className="admin-shortcut__arrow"
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="admin-block admin-panel">
        <SectionHead
          className="mb-5"
          title="Recent orders"
          titleClassName="!text-[clamp(1.35rem,2.5vw,1.75rem)]"
          action={
            <Link href="/admin/orders" className="admin-panel__link" prefetch>
              View all
              <ArrowUpRight size={14} aria-hidden />
            </Link>
          }
        />
        {stats.recent.length === 0 ? (
          <div className="admin-empty">
            <p className="font-medium">
              No personal orders yet. Browse the marketplace when you are ready.
            </p>
            <div className="mt-4 flex justify-center">
              <Button asChild href="/admin/marketplace" variant="accent">
                Open marketplace
              </Button>
            </div>
          </div>
        ) : (
          <ul className="admin-order-list">
            {stats.recent.map((o) => (
              <li key={o.id} className="admin-order-row">
                <div className="admin-order-row__main">
                  <p className="admin-order-row__id">{o.orderNumber}</p>
                  <div className="admin-order-row__meta">
                    <span suppressHydrationWarning>
                      {o.createdAt.toLocaleDateString("en-NG", {
                        timeZone: "Africa/Lagos",
                      })}
                    </span>
                    <Badge tone={statusTone(o.status)}>
                      {o.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                </div>
                <p className="admin-order-row__amount">
                  {formatMoney(o.totalMinor, o.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
