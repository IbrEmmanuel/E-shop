import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeader } from "@/components/dashboard/section-header";
import { VendorTabs } from "@/components/dashboard/vendor-tabs";
import { ProcessImportForm } from "@/components/forms/process-import-form";
import { RetryImportForm } from "@/components/forms/retry-import-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { getBatchAccessible } from "@/services/imports";

type Props = { params: Promise<{ id: string }> };

export default async function AdminBatchDetailPage({ params }: Props) {
  const session = await getSessionUser();
  const { id } = await params;

  let batch;
  try {
    batch = await getBatchAccessible(session, id);
  } catch {
    notFound();
  }

  const processed =
    batch.succeededRows + batch.failedRows + batch.skippedRows;
  const progress =
    batch.totalRows > 0
      ? Math.min(100, Math.round((processed / batch.totalRows) * 100))
      : 0;

  const vendorName =
    "vendor" in batch && batch.vendor
      ? batch.vendor.storeName
      : "Vendor";

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Batch dashboard"
        description="Upload progress, row outcomes, and safe retry for failures."
        userName={session?.name}
        actions={
          <Button asChild href="/admin/vendors/batches" variant="ghost">
            All batches
          </Button>
        }
      />
      <VendorTabs />

      <div className="card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Batch ID · {batch.id}
            </p>
            <h2
              className="mt-1 text-2xl"
            >
              {batch.filename}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {batch.createdAt.toLocaleString()} · {vendorName} · mode{" "}
              {batch.mode}
            </p>
          </div>
          <Badge tone="info">{batch.status}</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Total", batch.totalRows],
            ["Processed", processed],
            ["Succeeded", batch.succeededRows],
            ["Failed", batch.failedRows],
            ["Skipped", batch.skippedRows],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-[var(--radius-lg)] bg-[var(--color-surface-secondary)] p-3"
            >
              <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
              <p className="text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span>Progress</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
            <div
              className="h-full bg-[var(--color-primary)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="button-group justify-start">
          {(batch.status === "READY" || batch.status === "QUEUED") && (
            <ProcessImportForm batchId={batch.id} />
          )}
          {batch.failedRows > 0 &&
          (batch.status === "COMPLETED_WITH_ERRORS" ||
            batch.status === "COMPLETED") ? (
            <RetryImportForm batchId={batch.id} />
          ) : null}
          <Button
            asChild
            href={`/api/imports/${batch.id}/errors`}
            variant="outline"
            size="sm"
          >
            Download error report
          </Button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-3 py-2">Row</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Errors</th>
            </tr>
          </thead>
          <tbody>
            {batch.rows.map((row) => {
              let errors: string[] = [];
              try {
                errors = JSON.parse(row.errorsJson) as string[];
              } catch {
                errors = [];
              }
              return (
                <tr
                  key={row.id}
                  className="border-b border-[var(--color-border)]"
                >
                  <td className="px-3 py-2 tabular-nums">{row.rowNumber}</td>
                  <td className="px-3 py-2">{row.sku}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2 text-[var(--color-danger)]">
                    {errors.join("; ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-[var(--color-text-muted)]">
        Need another upload?{" "}
        <Link href="/admin/vendors/bulk" className="underline">
          Start a new import
        </Link>
      </p>
    </div>
  );
}
