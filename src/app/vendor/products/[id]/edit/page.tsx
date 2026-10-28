import { notFound, redirect } from "next/navigation";
import { ProductForm } from "@/components/forms/product-form";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export default async function VendorEditProductPage({ params }: Props) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?callbackUrl=/vendor/products/${id}/edit`);

  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
  if (!vendor) redirect("/vendor/apply");

  const product = await prisma.product.findFirst({
    where: { id, vendorId: vendor.id },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });
  if (!product) notFound();

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <header className="account-hero">
        <h1 className="account-hero__title">Edit product</h1>
        <p className="account-hero__lede">{product.title}</p>
      </header>
      <ProductForm
        categories={categories}
        defaultVendorId={vendor.id}
        vendors={[{ id: vendor.id, storeName: vendor.storeName }]}
        product={{
          id: product.id,
          title: product.title,
          description: product.description,
          sku: product.sku,
          price: (product.priceMinor / 100).toFixed(2),
          inventoryQty: product.inventoryQty,
          categoryId: product.categoryId,
          status: product.status,
          rejectionReason: product.rejectionReason,
          imageUrl: product.images[0]?.url ?? null,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
        }}
      />
    </div>
  );
}
