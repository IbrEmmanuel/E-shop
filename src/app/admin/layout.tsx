import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (!isStaffRole(user.role)) redirect("/");
  return (
    <AdminShell
      userName={user.name}
      userEmail={user.email}
      isSuperAdmin={user.role === "SUPER_ADMIN"}
    >
      {children}
    </AdminShell>
  );
}
