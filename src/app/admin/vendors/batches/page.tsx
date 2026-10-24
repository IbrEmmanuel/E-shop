import Link from "next/link";
import { SectionHeader } from "@/components/dashboard/section-header";
import { VendorTabs } from "@/components/dashboard/vendor-tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { ensureUserWorkspace } from "@/services/workspace";
import { prisma } from "@/lib/db";

export default async function VendorBatchesPage() {
  const session = await getSessionUser();
  const user = await ensureUserWorkspace(session!);

  const batches = user.vendor
    ? await prisma.importBatch.findMany({
        where: { vendorId: user.vendor.id },
        orderBy: { createdAt: "desc" },
        take: 40,
      })
    : user.role === "ADMIN"
      ? await prisma.importBatch.findMany({
          orderBy: { createdAt: "desc" },
          take: 40,
          include: { vendor: { select: { storeName: true } } },
        })
      : [];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Vendor"
        description="Products, bulk import, orders, and wallet."
        userName={user.name}
      />
      <VendorTabs />

      {batches.length === 0 ? (
        <EmptyState
          title="No import batches"
          description="CSV imports create tracked batches with row-level outcomes."
          action={
            <Button asChild href="/admin/vendors/bulk" variant="primary">
              Bulk upload
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {batches.map((b) => (
            <li
              key={b.id}
              className="card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-semibold">{b.filename}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {b.createdAt.toLocaleString()} · {b.mode} · {b.totalRows} rows
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="info">{b.status}</Badge>
                <Link
                  href={`/admin/vendors/batches/${b.id}`}
                  className="text-sm font-semibold underline"
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
