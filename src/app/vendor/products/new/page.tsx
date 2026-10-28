import { redirect } from "next/navigation";
import { ProductForm } from "@/components/forms/product-form";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function VendorNewProductPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/vendor/products/new");

  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
  if (!vendor) redirect("/vendor/apply");

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <header className="account-hero">
        <h1 className="account-hero__title">New product</h1>
        <p className="account-hero__lede">
          Listings submitted as Published may require admin review.
        </p>
      </header>
      <ProductForm
        categories={categories}
        defaultVendorId={vendor.id}
        vendors={[{ id: vendor.id, storeName: vendor.storeName }]}
      />
    </div>
  );
}
