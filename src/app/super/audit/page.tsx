import { SectionHeader } from "@/components/dashboard/section-header";
import { prisma } from "@/lib/db";

export default async function SuperAuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <SectionHeader
        title="Platform audit log"
        description="Immutable trail of role changes, payments, vendor decisions, and fulfillments."
      />
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Actor</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-[var(--color-border)]">
                <td className="px-4 py-3 whitespace-nowrap">
                  {l.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-3">{l.action}</td>
                <td className="px-4 py-3">
                  {l.entityType} {l.entityId}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {l.actorId ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 ? (
          <p className="mt-4 px-4 pb-4 text-sm text-[var(--color-text-muted)]">
            No events.
          </p>
        ) : null}
      </div>
    </div>
  );
}
