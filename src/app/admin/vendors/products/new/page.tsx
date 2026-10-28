import Link from "next/link";
import { redirect } from "next/navigation";
import { CreatePlatformShopButton } from "@/components/forms/create-platform-shop";
import { ProductForm } from "@/components/forms/product-form";
import { SectionHeader } from "@/components/dashboard/section-header";
import { VendorTabs } from "@/components/dashboard/vendor-tabs";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminNewVendorProductPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) redirect("/login?callbackUrl=/admin");

  const sp = await searchParams;
  const preselect =
    typeof sp.vendorId === "string" ? sp.vendorId : undefined;

  const [categories, vendors] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.vendor.findMany({
      orderBy: { storeName: "asc" },
      select: { id: true, storeName: true },
    }),
  ]);

  if (vendors.length === 0) {
    return (
      <div className="space-y-8">
        <SectionHeader
          title="Vendor"
          description="Products need a shop before you can add listings."
        />
        <VendorTabs />
        <div className="card max-w-lg space-y-4 p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">
            There are no shops yet. Create a platform shop now, or wait for a
            seller to apply and approve them under Applications.
          </p>
          <CreatePlatformShopButton />
          <Button asChild href="/admin/vendors" variant="outline" size="sm">
            View applications
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="New product"
        description="Add a listing to a vendor catalog."
        actions={
          <Button asChild href="/admin/vendors/products" variant="outline" size="sm">
            Back to products
          </Button>
        }
      />
      <VendorTabs />
      <ProductForm
        categories={categories}
        vendors={vendors}
        defaultVendorId={preselect ?? vendors[0]?.id}
      />
      <p className="text-sm text-[var(--color-text-muted)]">
        Prefer bulk?{" "}
        <Link href="/admin/vendors/bulk" className="underline">
          Upload CSV / XLSX
        </Link>
      </p>
    </div>
  );
}
