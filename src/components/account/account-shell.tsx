"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  UserRound,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/account", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/saved", label: "Saved", icon: Heart },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile", icon: UserRound },
];

export function AccountShell({
  children,
  name,
  email,
}: {
  children: React.ReactNode;
  name: string;
  email: string;
}) {
  const pathname = usePathname();
  const initial = (name || email || "U").charAt(0).toUpperCase();

  return (
    <div className="account-shell">
      <aside className="account-shell__rail">
        <div className="account-shell__identity">
          <span className="account-shell__avatar" aria-hidden>
            {initial}
          </span>
          <div className="min-w-0">
            <p className="account-shell__name truncate">{name}</p>
            <p className="account-shell__email truncate">{email}</p>
          </div>
        </div>

        <nav className="account-shell__nav" aria-label="Account">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
            Back to shop
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="account-shell__link account-shell__logout">
              <LogOut size={17} strokeWidth={1.5} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="account-shell__main">{children}</div>
    </div>
  );
}
