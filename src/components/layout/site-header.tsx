import Link from "next/link";
import { Search, ShoppingBag, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSessionUser } from "@/lib/auth";
import { getGuestKey } from "@/lib/guest";
import { getCartTotals } from "@/services/cart";

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/categories", label: "Categories" },
  { href: "/blog", label: "Blog" },
  { href: "/sell", label: "Sell" },
];

export async function SiteHeader() {
  const user = await getSessionUser();
  const guestKey = user ? null : await getGuestKey();
  let itemCount = 0;
  let siteName = "E-Shop";
  try {
    const { getSiteSettings } = await import("@/services/settings");
    siteName = (await getSiteSettings()).siteName;
  } catch {
    /* defaults */
  }
  try {
    if (user || guestKey) {
      const totals = await getCartTotals({
        userId: user?.id,
        guestKey,
      });
      itemCount = totals.itemCount;
    }
  } catch {
    itemCount = 0;
  }

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-[var(--glass-border)] surface-glass">
      <div className="container-page flex h-16 items-center gap-4 md:h-[4.5rem] md:gap-6">
        <Link href="/" className="type-h2 shrink-0 !text-[1.5rem] md:!text-[1.65rem]">
          {siteName}
        </Link>

        <nav className="ml-1 hidden items-center gap-1 text-sm font-medium md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link-nav rounded-[var(--radius-sm)] px-3 py-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form
          action="/search"
          className="mx-auto hidden max-w-md flex-1 lg:block"
        >
          <label className="relative block">
            <span className="sr-only">Search products</span>
            <Search
              size={15}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-soft-muted)]"
            />
            <input
              name="q"
              type="search"
              placeholder="Search your favorites…"
              className="input pl-11 text-sm"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/search"
            className="button button--glass button--icon lg:hidden"
            aria-label="Search"
          >
            <Search size={18} strokeWidth={1.5} />
          </Link>
          <ThemeToggle />
          <Link
            href="/cart"
            className="button button--glass button--icon relative"
            aria-label={`Cart${itemCount ? `, ${itemCount} items` : ""}`}
          >
            <ShoppingBag size={18} strokeWidth={1.5} />
            {itemCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-1 text-[10px] font-semibold text-white shadow-[var(--glow-primary)]">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            ) : null}
          </Link>
          <Link
            href={user?.role === "ADMIN" ? "/admin" : "/login"}
            className="button button--glass button--icon"
            aria-label={user?.role === "ADMIN" ? "Admin" : "Sign in"}
          >
            <User size={18} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </header>
  );
}
