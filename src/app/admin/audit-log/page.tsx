import { prisma } from "@/lib/db";

export default async function AdminAuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1
        className="mb-6 text-3xl"
      >
        Audit log
      </h1>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
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
                <td className="px-4 py-3">{l.actorId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {logs.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">No events.</p>
      ) : null}
    </div>
  );
}
