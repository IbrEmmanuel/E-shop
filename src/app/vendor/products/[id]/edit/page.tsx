import { notFound, redirect } from "next/navigation";
import { ProductForm } from "@/components/forms/product-form";
import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";
import { resolveVendorDesk, vendorDeskQuery } from "@/lib/vendor-desk";
import { prisma } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ vendorId?: string }>;
};

export default async function VendorEditProductPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?callbackUrl=/vendor/products/${id}/edit`);

  const query = (await searchParams) ?? {};
  const desk = await resolveVendorDesk({
    userId: user.id,
    role: user.role,
    vendorId: query.vendorId,
  });

  if (!desk.ok) {
    if (isStaffRole(user.role)) redirect("/admin/vendors");
    redirect("/vendor/apply");
  }

  const { vendor, inspecting } = desk;
  const deskQ = vendorDeskQuery(vendor.id, inspecting);

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
        <p className="account-hero__lede">
          {product.title} · {vendor.storeName}
        </p>
      </header>
      <ProductForm
        categories={categories}
        defaultVendorId={vendor.id}
        vendors={[{ id: vendor.id, storeName: vendor.storeName }]}
        returnTo={`/vendor/products${deskQ}`}
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
