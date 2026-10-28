import { listPublishedProducts } from "@/services/products";
import { ProductGrid } from "@/components/products/product-grid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Search products",
  description:
    "Search E-Shop by product name — see photos, prices, and buy instantly.",
  path: "/search",
});

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const result = q
    ? await listPublishedProducts({ q, pageSize: 24 }).catch(() => ({
        items: [] as Awaited<ReturnType<typeof listPublishedProducts>>["items"],
        total: 0,
      }))
    : { items: [] as Awaited<ReturnType<typeof listPublishedProducts>>["items"], total: 0 };

  return (
    <div className="container-page py-10 md:py-14">
      <h1
        className="type-h1"
      >
        Search
      </h1>
      <form className="mt-6 flex max-w-xl gap-2">
        <Input name="q" defaultValue={q} placeholder="Search products…" autoFocus />
        <Button type="submit">Search</Button>
      </form>
      <div className="mt-10">
        {q ? (
          <>
            <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
              {result.total} results for “{q}”
            </p>
            <ProductGrid
              products={result.items}
              emptyTitle="No matches"
              emptyDescription="Try a different keyword."
            />
          </>
        ) : (
          <p className="text-[var(--color-text-muted)]">
            Enter a query to search the catalog.
          </p>
        )}
      </div>
    </div>
  );
}
