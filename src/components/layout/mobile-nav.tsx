"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, Newspaper, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Shop", icon: Store },
  { href: "/sell", label: "Sell", icon: Plus },
  { href: "/blog", label: "Blog", icon: Newspaper },
  { href: "/account", label: "Account", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  const hide =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super") ||
    pathname.startsWith("/vendor") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register");

  if (hide) return null;

  return (
    <nav className="mobile-dock md:hidden" aria-label="Mobile">
      <ul className="mobile-dock__list">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "mobile-dock__link",
                  active && "mobile-dock__link--active",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
