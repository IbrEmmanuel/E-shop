import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductForm } from "@/components/forms/product-form";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditVendorProductPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if ((user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) redirect("/admin/vendors/products");

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      vendor: { select: { storeName: true } },
    },
  });
  if (!product) notFound();

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">
            {product.vendor.storeName}
          </p>
          <h1
            className="text-3xl"
          >
            Edit product
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Update description, price, image, and listing details.
          </p>
        </div>
        <Button asChild href="/admin/vendors/products" variant="outline" size="sm">
          Back to products
        </Button>
      </div>
      <ProductForm
        categories={categories}
        product={{
          id: product.id,
          title: product.title,
          description: product.description,
          sku: product.sku,
          price: (product.priceMinor / 100).toFixed(2),
          inventoryQty: product.inventoryQty,
          categoryId: product.categoryId,
          status: product.status,
          imageUrl: product.images[0]?.url,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
        }}
      />
      <p className="text-sm">
        <Link
          href={`/products/${product.slug}`}
          className="font-semibold text-[var(--color-primary)] underline"
        >
          View on storefront
        </Link>
      </p>
    </div>
  );
}
