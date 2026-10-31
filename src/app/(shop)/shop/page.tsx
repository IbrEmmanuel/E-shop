import Link from "next/link";
import { listPublishedProducts } from "@/services/products";
import { SponsoredShelf } from "@/components/ads/sponsored-shelf";
import { ProductGrid } from "@/components/products/product-grid";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Shop",
  description: "Browse published products from active E-Shop vendors.",
  path: "/shop",
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const categorySlug =
    typeof sp.category === "string" ? sp.category : undefined;
  const sort =
    typeof sp.sort === "string"
      ? (sp.sort as "newest" | "price_asc" | "price_desc" | "title")
      : "newest";
  const page = Math.max(1, Number(sp.page) || 1);

  let categories: { name: string; slug: string }[] = [];
  let result = {
    items: [] as Awaited<ReturnType<typeof listPublishedProducts>>["items"],
    total: 0,
    page: 1,
    pageSize: 24,
    pageCount: 1,
  };

  try {
    [categories, result] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { name: true, slug: true },
      }),
      listPublishedProducts({ q, categorySlug, sort, page, pageSize: 24 }),
    ]);
  } catch {
    /* empty */
  }

  return (
    <div className="container-page py-14 md:py-20">
      <header className="mb-10 max-w-2xl">
        <h1 className="type-h1 !text-[clamp(2.2rem,4vw,3.25rem)]">Shop</h1>
        <p className="type-body mt-3">
          {result.total} product{result.total === 1 ? "" : "s"}
          {q ? ` for “${q}”` : ""}
        </p>
      </header>

      <form className="card mb-12 grid gap-3 p-4 md:grid-cols-[1fr_12rem_12rem_auto]">
        <Input name="q" defaultValue={q} placeholder="Search…" />
        <Select name="category" defaultValue={categorySlug || ""}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select name="sort" defaultValue={sort}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="title">Title</option>
        </Select>
        <Button type="submit" variant="primary">
          Apply
        </Button>
      </form>

      <SponsoredShelf />

      <ProductGrid products={result.items} />

      {result.pageCount > 1 ? (
        <nav className="mt-10 flex items-center justify-center gap-3">
          {page > 1 ? (
            <Button
              asChild
              href={`/shop?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(categorySlug ? { category: categorySlug } : {}),
                sort,
                page: String(page - 1),
              }).toString()}`}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
          ) : null}
          <span className="text-sm text-[var(--color-text-muted)]">
            Page {result.page} of {result.pageCount}
          </span>
          {page < result.pageCount ? (
            <Button
              asChild
              href={`/shop?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(categorySlug ? { category: categorySlug } : {}),
                sort,
                page: String(page + 1),
              }).toString()}`}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          ) : null}
        </nav>
      ) : null}

      {categories.length > 0 ? (
        <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
          Or browse{" "}
          <Link
            href={`/shop?category=${encodeURIComponent(categories[0].slug)}`}
            className="underline"
          >
            {categories[0].name}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
