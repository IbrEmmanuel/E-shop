"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/vendors", label: "Overview", exact: true },
  { href: "/admin/vendors/products", label: "Products" },
  { href: "/admin/vendors/bulk", label: "Bulk" },
  { href: "/admin/vendors/batches", label: "Batches" },
  { href: "/admin/vendors/orders", label: "Orders" },
  { href: "/admin/vendors/wallet", label: "Wallet" },
  { href: "/admin/vendors/payouts", label: "Payouts" },
  { href: "/admin/vendors/settings", label: "Settings" },
];

export function VendorTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const active = t.exact
          ? pathname === t.href
          : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "whitespace-nowrap rounded-[var(--radius-pill)] px-3.5 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
