import { SectionHeader } from "@/components/dashboard/section-header";
import { VendorTabs } from "@/components/dashboard/vendor-tabs";
import { ImportUploadForm } from "@/components/forms/import-upload-form";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function VendorBulkPage() {
  const session = await getSessionUser();
  const vendors = await prisma.vendor.findMany({
    orderBy: { storeName: "asc" },
    select: { id: true, storeName: true },
    take: 200,
  });
  return (
    <div className="space-y-8">
      <SectionHeader
        title="Vendor"
        description="Products, bulk import, orders, and wallet."
        userName={session?.name}
      />
      <VendorTabs />
      <div className="card space-y-4 p-6">
        <h2
          className="text-2xl"
        >
          Bulk upload
        </h2>
        <p className="text-[var(--color-text-secondary)]">
          Download CSV or XLSX templates, validate rows, preview via batch
          status, then commit. SKU duplicates follow create / update / upsert
          mode. Failed rows can be retried without duplicating successes.
        </p>
        <div className="button-group justify-start">
          <Button asChild href="/api/imports/template?format=csv" variant="outline">
            CSV template
          </Button>
          <Button
            asChild
            href="/api/imports/template?format=xlsx"
            variant="outline"
          >
            XLSX template
          </Button>
          <Button asChild href="/admin/vendors/batches" variant="ghost">
            Batch dashboard
          </Button>
        </div>
      </div>
      <ImportUploadForm vendors={vendors} />
    </div>
  );
}
