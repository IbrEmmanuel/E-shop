import { redirect } from "next/navigation";
import { ProductForm } from "@/components/forms/product-form";
import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";
import { resolveVendorDesk, vendorDeskQuery } from "@/lib/vendor-desk";
import { prisma } from "@/lib/db";

export default async function VendorNewProductPage({
  searchParams,
}: {
  searchParams?: Promise<{ vendorId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/vendor/products/new");

  const params = (await searchParams) ?? {};
  const desk = await resolveVendorDesk({
    userId: user.id,
    role: user.role,
    vendorId: params.vendorId,
  });

  if (!desk.ok) {
    if (isStaffRole(user.role)) redirect("/admin/vendors");
    redirect("/vendor/apply");
  }

  const { vendor, inspecting } = desk;
  const deskQ = vendorDeskQuery(vendor.id, inspecting);

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
          This listing belongs to {vendor.storeName}. Published items may need
          admin review before they go live.
        </p>
      </header>
      <ProductForm
        categories={categories}
        defaultVendorId={vendor.id}
        vendors={[{ id: vendor.id, storeName: vendor.storeName }]}
        returnTo={`/vendor/products${deskQ}`}
      />
    </div>
  );
}
