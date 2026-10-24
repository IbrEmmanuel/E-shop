import Link from "next/link";
import { redirect } from "next/navigation";
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
  if (!user || user.role !== "ADMIN") redirect("/login?callbackUrl=/admin");

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
          description="Create a listing for an approved shop."
        />
        <VendorTabs />
        <p className="text-sm text-[var(--color-text-secondary)]">
          No vendor shops yet. Approve an application first.
        </p>
        <Button asChild href="/admin/vendors" variant="outline">
          Applications
        </Button>
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
