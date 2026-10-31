import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { listPublishedProducts } from "@/services/products";
import { ProductGrid } from "@/components/products/product-grid";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const cat = await prisma.category.findUnique({ where: { slug } }).catch(() => null);
  return buildMetadata({
    title: cat?.name || "Category",
    description: cat?.description,
    path: `/categories/${slug}`,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const sort =
    typeof sp.sort === "string"
      ? (sp.sort as "newest" | "price_asc" | "price_desc" | "title")
      : "newest";
  const page = Math.max(1, Number(sp.page) || 1);

  const category = await prisma.category
    .findFirst({ where: { slug, isActive: true } })
    .catch(() => null);
  if (!category) notFound();

  const result = await listPublishedProducts({
    q,
    categorySlug: slug,
    sort,
    page,
    pageSize: 24,
  }).catch(() => ({
    items: [] as Awaited<ReturnType<typeof listPublishedProducts>>["items"],
    total: 0,
    page: 1,
    pageSize: 24,
    pageCount: 1,
  }));

  const queryBase = {
    ...(q ? { q } : {}),
    sort,
  };

  return (
    <div className="container-page py-10 md:py-14">
      <p className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/categories" className="font-semibold underline">
          ← All categories
        </Link>
        <Link href="/shop" className="font-semibold underline">
          Shop all products
        </Link>
      </p>
      <h1 className="type-h1">{category.name}</h1>
      {category.description ? (
        <p className="mt-2 max-w-2xl text-[var(--color-text-secondary)]">
          {category.description}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        {result.total} product{result.total === 1 ? "" : "s"} in this kind
        {q ? ` for “${q}”` : ""}
      </p>

      <form className="card mb-10 mt-8 grid gap-3 p-4 md:grid-cols-[1fr_12rem_auto]">
        <Input name="q" defaultValue={q} placeholder="Search in this category…" />
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

      <ProductGrid
        products={result.items}
        emptyTitle="No products in this category"
      />

      {result.pageCount > 1 ? (
        <nav className="mt-10 flex items-center justify-center gap-3">
          {page > 1 ? (
            <Button
              asChild
              href={`/categories/${slug}?${new URLSearchParams({
                ...queryBase,
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
              href={`/categories/${slug}?${new URLSearchParams({
                ...queryBase,
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
    </div>
  );
}
