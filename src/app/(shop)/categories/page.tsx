import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { SafeImage } from "@/components/products/safe-image";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata = buildMetadata({
  title: "Categories",
  description: "Browse E-Shop categories from active vendors.",
  path: "/categories",
});

export default async function CategoriesIndexPage() {
  const categories = await prisma.category
    .findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    })
    .catch(() => []);

  return (
    <div className="container-page py-10 md:py-14">
      <header className="mb-10 max-w-2xl">
        <h1 className="type-h1">Categories</h1>
        <p className="type-body mt-2">
          Explore products by lane across the marketplace.
        </p>
      </header>

      {categories.length === 0 ? (
        <EmptyState
          title="Categories coming soon"
          description="Active collections will appear here as vendors publish."
          action={
            <Button asChild href="/shop" variant="primary">
              Browse shop
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/categories/${c.slug}`}
                className="card group block overflow-hidden p-0 transition-shadow hover:shadow-[var(--shadow-md)]"
              >
                <div className="relative aspect-[16/10] bg-[var(--color-bg-subtle)]">
                  {c.imageUrl ? (
                    <SafeImage
                      src={c.imageUrl}
                      alt={c.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                  ) : null}
                </div>
                <div className="space-y-1 p-5">
                  <h2 className="type-h2 !text-xl">{c.name}</h2>
                  {c.description ? (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {c.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {c._count.products} product
                    {c._count.products === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
