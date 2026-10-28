import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  VENDOR_ORDER_TABS,
  type VendorOrderTab,
} from "@/lib/vendor-order-status";

export function VendorOrderTabs({
  active,
  counts,
  basePath = "/admin/vendors/orders",
  vendorId,
}: {
  active: VendorOrderTab;
  counts: Record<VendorOrderTab, number>;
  basePath?: string;
  vendorId?: string | null;
}) {
  function hrefFor(tabKey: string) {
    const qs = new URLSearchParams();
    if (vendorId) qs.set("vendorId", vendorId);
    if (tabKey !== "all") qs.set("tab", tabKey);
    const q = qs.toString();
    return q ? `${basePath}?${q}` : basePath;
  }

  return (
    <nav
      className="flex gap-2 overflow-x-auto pb-1"
      aria-label="Order filters"
    >
      {VENDOR_ORDER_TABS.map((tab) => {
        const href = hrefFor(tab.key);
        const isActive = active === tab.key;
        const count = counts[tab.key] ?? 0;
        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] px-3.5 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs tabular-nums",
                isActive ? "bg-white/20" : "bg-[var(--color-border)]",
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
