"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Store,
  Wallet,
  Banknote,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/vendor", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/vendor/products", label: "Products", icon: Package },
  { href: "/vendor/orders", label: "Orders", icon: ShoppingBag },
  { href: "/vendor/earnings", label: "Earnings", icon: Wallet },
  { href: "/vendor/payouts", label: "Payouts", icon: Banknote },
];

export function VendorShell({
  children,
  storeName,
  email,
}: {
  children: React.ReactNode;
  storeName: string;
  email: string;
}) {
  const pathname = usePathname();

  return (
    <div className="container-page py-8 md:py-12">
      <div className="account-shell">
        <aside className="account-shell__rail">
          <div className="account-shell__identity">
            <span className="account-shell__avatar" aria-hidden>
              <Store size={18} />
            </span>
            <div className="min-w-0">
              <p className="account-shell__name truncate">{storeName}</p>
              <p className="account-shell__email truncate">{email}</p>
            </div>
          </div>

          <nav className="account-shell__nav" aria-label="Vendor desk">
            {nav.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "account-shell__link",
                    active && "account-shell__link--active",
                  )}
                >
                  <Icon size={17} strokeWidth={active ? 2 : 1.5} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="account-shell__foot">
            <Link href="/shop" className="account-shell__link">
              View storefront
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="account-shell__link account-shell__logout"
              >
                <LogOut size={17} strokeWidth={1.5} />
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="account-shell__main">{children}</div>
      </div>
    </div>
  );
}
