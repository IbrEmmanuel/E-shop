import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { listPublishedProducts } from "@/services/products";
import { ProductGrid } from "@/components/products/product-grid";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const cat = await prisma.category.findUnique({ where: { slug } }).catch(() => null);
  return buildMetadata({
    title: cat?.name || "Category",
    description: cat?.description,
    path: `/categories/${slug}`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await prisma.category
    .findFirst({ where: { slug, isActive: true } })
    .catch(() => null);
  if (!category) notFound();

  const { items } = await listPublishedProducts({
    categorySlug: slug,
    pageSize: 24,
  }).catch(() => ({ items: [] as Awaited<ReturnType<typeof listPublishedProducts>>["items"] }));

  return (
    <div className="container-page py-10 md:py-14">
      <h1
        className="type-h1"
      >
        {category.name}
      </h1>
      {category.description ? (
        <p className="mt-2 max-w-2xl text-[var(--color-text-secondary)]">
          {category.description}
        </p>
      ) : null}
      <div className="mt-8">
        <ProductGrid
          products={items}
          emptyTitle="No products in this category"
        />
      </div>
    </div>
  );
}
