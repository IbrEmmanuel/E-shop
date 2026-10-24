"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Store,
  MessagesSquare,
  UserRound,
  LogOut,
  ShoppingBag,
  Megaphone,
  Settings,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  exact?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Commerce",
    items: [
      { href: "/admin/orders", label: "Orders", icon: Package },
      { href: "/admin/marketplace", label: "Marketplace", icon: ShoppingBag },
      { href: "/admin/vendors", label: "Vendor", icon: Store },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/admin/advertising", label: "Advertising", icon: Megaphone },
      { href: "/admin/consultations", label: "Consultations", icon: MessagesSquare },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/admin/profile", label: "Profile", icon: UserRound },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const flatNav = navGroups.flatMap((g) => g.items);

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
  pathname,
}: NavItem & { pathname: string }) {
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      prefetch
      className={cn("admin-nav__link", active && "admin-nav__link--active")}
      aria-current={active ? "page" : undefined}
    >
      <span className="admin-nav__rail" aria-hidden />
      <span className="admin-nav__icon" aria-hidden>
        <Icon size={17} strokeWidth={1.6} />
      </span>
      <span className="admin-nav__label">{label}</span>
    </Link>
  );
}

function NavGroups({ pathname }: { pathname: string }) {
  return (
    <>
      {navGroups.map((group) => (
        <div key={group.title} className="admin-nav__group">
          <p className="admin-sidebar__section">{group.title}</p>
          <div className="admin-nav__stack">
            {group.items.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function AdminShell({
  children,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const initial = (userName || "A").trim().charAt(0).toUpperCase();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__glow" aria-hidden />

        <div className="admin-sidebar__brand">
          <Link href="/admin" className="admin-sidebar__logo">
            <span className="admin-sidebar__mark">E</span>
            <span>
              <span className="admin-sidebar__name">E-Shop</span>
              <span className="admin-sidebar__tag">Console</span>
            </span>
          </Link>
          <ThemeToggle className="admin-sidebar__theme" />
        </div>

        <nav className="admin-nav" aria-label="Admin">
          <NavGroups pathname={pathname} />
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <span className="admin-sidebar__avatar" aria-hidden>
              {initial}
            </span>
            <span className="min-w-0">
              <p className="admin-sidebar__user-name">{userName || "Admin"}</p>
              <p className="admin-sidebar__user-email">{userEmail}</p>
            </span>
          </div>
          <div className="admin-sidebar__actions">
            <Button asChild href="/" size="sm" variant="ghost" className="flex-1">
              Store
            </Button>
            <form action={logoutAction} className="flex-1">
              <Button type="submit" size="sm" variant="outline" className="w-full">
                <LogOut size={14} />
                Out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-mobile-bar">
          <div className="flex min-w-0 items-center gap-3">
            <span className="admin-sidebar__avatar" aria-hidden>
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{userName || "Admin"}</p>
              <p className="truncate text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Console
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={logoutAction}>
              <Button type="submit" size="sm" variant="outline">
                Sign out
              </Button>
            </form>
          </div>
        </header>

        <div className="admin-mobile-nav">
          <nav className="admin-nav admin-nav--mobile" aria-label="Admin mobile">
            {flatNav.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} />
            ))}
          </nav>
        </div>

        <div className="admin-main">
          <div className="admin-main__inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
