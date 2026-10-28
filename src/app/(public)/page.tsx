import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { listPublished } from "@/services/blog";
import { listPublishedProducts } from "@/services/products";
import { listActivePlans } from "@/services/rentals";
import { getSiteSettings } from "@/services/settings";
import { AuthParticleOrb } from "@/components/auth/auth-particle-orb";
import { SponsoredShelf } from "@/components/ads/sponsored-shelf";
import { SectionHead } from "@/components/layout/section-head";
import { ProductGrid } from "@/components/products/product-grid";
import { SafeImage } from "@/components/products/safe-image";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const settings = await getSiteSettings();
  let products: Awaited<ReturnType<typeof listPublishedProducts>>["items"] = [];
  let categories: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  }[] = [];
  let plans: Awaited<ReturnType<typeof listActivePlans>> = [];
  let posts: Awaited<ReturnType<typeof listPublished>>["items"] = [];
  let vendors: {
    id: string;
    storeName: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
  }[] = [];
  let vendorCount = 0;

  try {
    const [listed, cats, rentalPlans, vendorList, vendorsTotal, blog] =
      await Promise.all([
        listPublishedProducts({ pageSize: 12, sort: "newest" }),
        prisma.category.findMany({
          where: {
            isActive: true,
            parentId: null,
            OR: [
              { imageUrl: { not: null } },
              { products: { some: { status: "PUBLISHED" } } },
            ],
          },
          orderBy: { sortOrder: "asc" },
          take: 8,
          select: { id: true, name: true, slug: true, imageUrl: true },
        }),
        listActivePlans(),
        prisma.vendor.findMany({
          where: { status: "ACTIVE" },
          orderBy: { storeName: "asc" },
          take: 4,
          select: {
            id: true,
            storeName: true,
            slug: true,
            description: true,
            logoUrl: true,
            bannerUrl: true,
          },
        }),
        prisma.vendor.count({ where: { status: "ACTIVE" } }),
        listPublished({ pageSize: 6 }),
      ]);
    products = listed.items;
    // Prefer categories that already have cover art; otherwise borrow a product photo.
    categories = await Promise.all(
      cats.map(async (cat) => {
        if (cat.imageUrl) return cat;
        const cover = await prisma.product.findFirst({
          where: {
            categoryId: cat.id,
            status: "PUBLISHED",
            images: { some: {} },
          },
          select: {
            images: {
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: { url: true },
            },
          },
        });
        return { ...cat, imageUrl: cover?.images[0]?.url ?? null };
      }),
    );
    plans = rentalPlans;
    vendors = vendorList;
    vendorCount = vendorsTotal;
    posts = blog.items;
  } catch {
    /* render gracefully when DB is unavailable */
  }

  const fromPrice = plans[0]
    ? formatMoney(plans[0].monthlyPriceMinor, plans[0].currency)
    : null;
  const sellImage = products[0]?.images[0]?.url || null;
  return (
    <div className="home-page">
      <section className="home-hero relative min-h-[92vh] overflow-hidden">
        <div className="home-hero__backdrop" aria-hidden>
          <div className="home-hero__atmosphere">
            <span className="home-hero__glow home-hero__glow--a" />
            <span className="home-hero__glow home-hero__glow--b" />
            <span className="home-hero__glow home-hero__glow--c" />
            <span className="home-hero__grain" />
          </div>
          <div className="home-hero__orb-stage">
            <AuthParticleOrb
              label={settings.siteName}
              variant="hero"
              className="home-hero__orb"
            />
            <span className="home-hero__floor-shadow" />
          </div>
          <div className="home-hero__wash" />
        </div>
        <div className="container-page relative z-[2] flex min-h-[92vh] items-end pb-16 pt-28 md:items-center md:pb-24 md:pt-24">
          <div className="relative max-w-xl space-y-5 md:max-w-2xl md:space-y-6">
            <p className="home-reveal home-reveal--1 type-h1">
              {settings.siteName}
            </p>
            <h1 className="home-reveal home-reveal--2 type-body max-w-lg md:text-lg">
              {settings.tagline}
            </h1>
            <p className="home-reveal home-reveal--3 max-w-md text-sm leading-relaxed text-[var(--color-soft-muted)]">
              {vendorCount > 0
                ? `Independent shops with live inventory, bank transfer checkout, and delivery you can track.`
                : `Live inventory, bank transfer checkout, and monthly shop rentals for independent makers.`}
            </p>
            <div className="home-reveal home-reveal--4 button-group button-group--stack-mobile pt-1">
              <Button asChild href="/shop" variant="accent" size="lg">
                Shop the catalog
              </Button>
              <Button asChild href="/sell" variant="dark" size="lg">
                Open a shop
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="app-section container-page py-20 md:py-28">
        <SectionHead
          title="Shop by category"
          lede="Browse lanes curated from active vendors."
          action={
            <Button asChild href="/categories" variant="ghost" size="sm">
              All categories
            </Button>
          }
        />
        {categories.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            New collections are being prepared. Check back shortly or browse the
            full shop.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="home-lane card group relative block overflow-hidden"
              >
                <div className="relative aspect-[3/4] bg-[var(--color-bg-subtle)]">
                  {cat.imageUrl ? (
                    <SafeImage
                      src={cat.imageUrl}
                      alt={cat.name}
                      fill
                      className="object-cover transition-transform duration-500 ease-[var(--ease-standard)] group-hover:scale-[1.05]"
                      sizes="(max-width:768px) 50vw, 16vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-surface-secondary)] to-[var(--color-bg-subtle)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-overlay)] via-[color-mix(in_oklab,var(--color-overlay)_35%,transparent)] to-transparent" />
                  <span className="absolute bottom-3 left-3 right-3 font-[family-name:var(--font-display)] text-base font-semibold text-white drop-shadow md:text-sm">
                    {cat.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {vendors.length > 0 ? (
        <section className="app-section border-y border-[var(--glass-border)] py-20 md:py-24">
          <div className="container-page">
            <SectionHead
              title="Featured shops"
              lede="Meet the independent storefronts stocking the catalog."
              action={
                <Button asChild href="/sell" variant="ghost" size="sm">
                  Become a seller
                </Button>
              }
            />
            <ul className="grid gap-4 md:grid-cols-2">
              {vendors.map((vendor) => (
                <li key={vendor.id}>
                  <Link
                    href={`/vendors/${vendor.slug}`}
                    className="home-shop card group relative flex min-h-[11rem] overflow-hidden"
                  >
                    <div className="absolute inset-0">
                      {vendor.bannerUrl || vendor.logoUrl ? (
                        <SafeImage
                          src={vendor.bannerUrl || vendor.logoUrl!}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width:768px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="h-full w-full bg-[var(--color-surface)]" />
                      )}
                      <div className="home-shop-wash" aria-hidden />
                    </div>
                    <div className="relative z-[1] flex flex-col justify-end gap-1 p-6 md:p-8">
                      <p className="type-h2 !text-2xl text-[var(--color-text)]">
                        {vendor.storeName}
                      </p>
                      {vendor.description ? (
                        <p className="line-clamp-2 max-w-md text-sm text-[var(--color-text-secondary)]">
                          {vendor.description}
                        </p>
                      ) : (
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Visit storefront
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="app-section py-20 md:py-28">
        <div className="container-page">
          <SponsoredShelf />
          <SectionHead
            title="New arrivals"
            lede="Fresh listings from active storefronts."
            action={
              <Button asChild href="/shop" variant="outline" size="sm">
                View all
              </Button>
            }
          />
          <ProductGrid
            products={products}
            emptyTitle="Catalog updating"
            emptyDescription="Published products from active vendors will appear here."
          />
        </div>
      </section>

      <section
        id="blog"
        className="app-section border-t border-[var(--glass-border)] py-20 md:py-28"
      >
        <div className="container-page">
          <SectionHead
            title="Blog"
            lede="Stories, guides, and marketplace notes."
            action={
              <Button asChild href="/blog" variant="outline" size="sm">
                View all
              </Button>
            }
          />
          {posts.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              New stories are on the way. Visit the blog soon.
            </p>
          ) : (
            <ul className="grid gap-10 md:grid-cols-2 md:gap-12">
              {posts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="editorial-tile group block h-full"
                  >
                    {post.featuredImage ? (
                      <div className="relative mb-5 aspect-[16/10] overflow-hidden bg-[var(--color-surface)]">
                        <SafeImage
                          src={post.featuredImage}
                          alt={post.featuredAlt || post.title}
                          fill
                          className="object-cover transition-transform duration-700 ease-[var(--ease-standard)] group-hover:scale-[1.03]"
                          sizes="(max-width:768px) 100vw, 50vw"
                        />
                      </div>
                    ) : null}
                    <h3 className="type-h2 !text-2xl md:!text-[1.75rem]">
                      {post.title}
                    </h3>
                    {post.excerpt ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {post.excerpt}
                      </p>
                    ) : null}
                    <p
                      className="mt-4 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-text-muted)]"
                      suppressHydrationWarning
                    >
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString(
                            "en-NG",
                            { timeZone: "Africa/Lagos" },
                          )
                        : null}
                      {post.author?.name ? ` · ${post.author.name}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="home-sell relative overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0 -z-10">
          {sellImage ? (
            <SafeImage
              src={sellImage}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="home-sell__brand-field" aria-hidden />
          )}
          <div className="home-sell__wash" aria-hidden />
        </div>
        <div className="container-page relative max-w-2xl">
          <h2 className="type-h1 text-[var(--color-text)]">
            Rent a shop. Pay monthly.
          </h2>
          <p className="mt-4 max-w-lg text-[var(--color-text-secondary)]">
            Pick a plan
            {fromPrice ? ` from ${fromPrice}` : ""}, open your branded
            storefront, import inventory in bulk, and publish when your rental
            is active.
          </p>
          <div className="mt-8">
            <Button asChild href="/sell" variant="accent" size="lg">
              See plans
            </Button>
          </div>
        </div>
      </section>

      <section className="app-section border-t border-[var(--color-border)] py-20 md:py-24">
        <div className="container-page flex flex-col items-stretch justify-between gap-10 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <h2 className="type-h2">Ready when you are</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Explore the catalog, follow vendors you trust, or start selling
              this month — with order tracking after payment approval.
            </p>
          </div>
          <div className="button-group button-group--stack-mobile shrink-0 md:ml-auto">
            <Button asChild href="/shop" variant="primary" size="lg">
              Browse shop
            </Button>
            <Button asChild href="/account/orders" variant="outline" size="lg">
              Track an order
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
