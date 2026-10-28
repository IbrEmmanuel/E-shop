import { RoleForm, StatusForm } from "@/components/super/role-form";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";

export default async function SuperAdminsPage() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { role: { in: ["ADMIN", "SUPER_ADMIN", "VENDOR"] } },
        { status: "DISABLED" },
      ],
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <SectionHeader
        title="Admins & roles"
        description="Promote operators, demote access, and disable compromised accounts."
      />
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--color-border)]">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name || "—"}</p>
                  <p className="text-[var(--color-text-muted)]">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge>{u.role.replaceAll("_", " ")}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    tone={u.status === "DISABLED" ? "danger" : "success"}
                  >
                    {u.status}
                  </Badge>
                </td>
                <td className="space-y-2 px-4 py-3">
                  <RoleForm userId={u.id} currentRole={u.role} />
                  <StatusForm userId={u.id} currentStatus={u.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">
            No operators yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
