import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";

export default async function AdminImportsPage() {
  const batches = await prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { vendor: { select: { storeName: true } } },
  });

  return (
    <div>
      <h1
        className="mb-6 text-3xl"
      >
        Imports
      </h1>
      <ul className="space-y-3">
        {batches.map((b) => (
          <li key={b.id} className="card flex justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-semibold">{b.filename}</p>
              <p className="text-[var(--color-text-muted)]">
                {b.vendor.storeName} · {b.totalRows} rows ·{" "}
                {b.createdAt.toLocaleString()}
              </p>
            </div>
            <Badge tone="info">{b.status}</Badge>
          </li>
        ))}
        {batches.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No import batches.</p>
        ) : null}
      </ul>
    </div>
  );
}
