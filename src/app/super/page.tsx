import Link from "next/link";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";

export default async function SuperAdminHomePage() {
  const [admins, vendors, customers, recentAudit] = await Promise.all([
    prisma.user.count({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    }),
    prisma.user.count({ where: { role: "VENDOR" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-10">
      <SectionHeader
        title="Super admin"
        description="Platform-wide access control, operator roles, and audit oversight."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Operators" value={admins} href="/super/admins" />
        <Stat label="Vendors" value={vendors} href="/admin/vendors" />
        <Stat label="Customers" value={customers} href="/admin/customers" />
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold">Recent audit</h2>
          <Button asChild href="/super/audit" size="sm" variant="outline">
            Full log
          </Button>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
              </tr>
            </thead>
            <tbody>
              {recentAudit.map((l) => (
                <tr key={l.id} className="border-b border-[var(--color-border)]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {l.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{l.action}</td>
                  <td className="px-4 py-3">
                    {l.entityType} {l.entityId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentAudit.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">
              No audit events yet.
            </p>
          ) : null}
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Button asChild href="/admin" variant="primary">
          Open admin console
        </Button>
        <Button asChild href="/super/admins" variant="outline">
          Manage roles
        </Button>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="card block p-5 transition hover:opacity-90">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
    </Link>
  );
}
