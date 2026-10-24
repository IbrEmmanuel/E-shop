import { prisma } from "@/lib/db";

export default async function AdminCustomersPage() {
  const users = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  return (
    <div>
      <h1
        className="mb-6 text-3xl"
      >
        Customers
      </h1>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--color-border)]">
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u._count.orders}</td>
                <td className="px-4 py-3">{u.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
