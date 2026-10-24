import Link from "next/link";
import { getSiteSettings } from "@/services/settings";

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const columns = [
    {
      title: "Shop",
      links: [
        { href: "/shop", label: "All products" },
        { href: "/categories", label: "Categories" },
        { href: "/search", label: "Search" },
        { href: "/blog", label: "Blog" },
        { href: "/sell", label: "Sell on E-Shop" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/about", label: "About" },
        { href: "/contact", label: "Contact" },
        { href: "/shipping-returns", label: "Shipping & returns" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
      ],
    },
  ];

  return (
    <footer className="mt-auto border-t border-[var(--glass-border)] surface-glass pb-28 md:pb-0">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-10 md:py-20">
        <div>
          <p className="type-h2 !text-[1.75rem]">{settings.siteName}</p>
          <p className="type-body mt-4 max-w-xs">{settings.tagline}</p>
          <p className="mt-6 text-sm">
            <a
              className="link-nav"
              href={`mailto:${settings.supportEmail}`}
            >
              {settings.supportEmail}
            </a>
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--color-soft-muted)]">
              {col.title}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-[var(--color-soft)]">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-[var(--color-primary)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
