import Link from "next/link";
import { addToCartAction, buyNowAction } from "@/app/actions/cart";
import { SectionHeader } from "@/components/dashboard/section-header";
import { SafeImage } from "@/components/products/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/db";
import { listPublishedProducts } from "@/services/products";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminMarketplacePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSessionUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const categorySlug =
    typeof sp.category === "string" ? sp.category : undefined;
  const sort =
    typeof sp.sort === "string"
      ? (sp.sort as "newest" | "price_asc" | "price_desc" | "title")
      : "newest";
  const page = Math.max(1, Number(sp.page) || 1);

  const [categories, result] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { name: true, slug: true },
    }),
    listPublishedProducts({ q, categorySlug, sort, page, pageSize: 24 }),
  ]);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Marketplace"
        description="Live catalog from the database — search, filter, add to cart, or buy now."
        userName={session?.name}
        actions={
          <div className="button-group justify-end">
            <Button asChild href="/cart" variant="outline">
              Cart
            </Button>
            <Button asChild href="/shop" variant="ghost">
              Public shop
            </Button>
          </div>
        }
      />

      <form className="card grid gap-3 p-4 md:grid-cols-[1fr_12rem_12rem_auto]">
        <Input name="q" defaultValue={q} placeholder="Search products…" />
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

      <p className="text-sm text-[var(--color-text-muted)]">
        {result.total === 1 ? "1 product" : `${result.total} products`}
        {q ? ` matching “${q}”` : ""}
      </p>

      {result.items.length === 0 ? (
        <EmptyState
          title="No products"
          description="Publish vendor products to populate the marketplace."
          action={
            <Button asChild href="/admin/vendors/products" variant="primary">
              Vendor products
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((product) => {
            const available = Math.max(
              0,
              product.inventoryQty - product.reservedQty,
            );
            const image = product.images[0];
            return (
              <li key={product.id} className="card overflow-hidden">
                <Link
                  href={`/products/${product.slug}`}
                  className="relative block bg-[var(--color-bg-subtle)]"
                  style={{ aspectRatio: "4 / 3" }}
                >
                  {image ? (
                    <SafeImage
                      src={image.url}
                      alt={image.altText || product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
                      No image
                    </div>
                  )}
                </Link>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                        {product.vendor.storeName}
                      </p>
                      <Link href={`/products/${product.slug}`}>
                        <h2 className="mt-1 line-clamp-2 font-semibold leading-snug">
                          {product.title}
                        </h2>
                      </Link>
                    </div>
                    <Badge tone={available > 0 ? "success" : "warning"}>
                      {available > 0 ? `${available} left` : "Out"}
                    </Badge>
                  </div>
                  <p className="font-semibold tabular-nums">
                    {formatMoney(product.priceMinor, product.currency)}
                  </p>
                  <div className="button-group button-group--stack-mobile justify-start">
                    <form action={addToCartAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="quantity" value="1" />
                      <Button
                        type="submit"
                        size="sm"
                        variant="primary"
                        disabled={available < 1}
                      >
                        Add to cart
                      </Button>
                    </form>
                    <form action={buyNowAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="quantity" value="1" />
                      <Button
                        type="submit"
                        size="sm"
                        variant="accent"
                        disabled={available < 1}
                      >
                        Buy now
                      </Button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {result.pageCount > 1 ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: result.pageCount }, (_, i) => i + 1).map(
            (p) => (
              <Link
                key={p}
                href={`/admin/marketplace?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}${categorySlug ? `&category=${categorySlug}` : ""}&sort=${sort}`}
                className={`rounded-[var(--radius-pill)] px-3 py-1.5 text-sm font-semibold ${
                  p === result.page
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "bg-[var(--color-surface-secondary)]"
                }`}
              >
                {p}
              </Link>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
