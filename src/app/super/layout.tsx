import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/super");
  if (user.role !== "SUPER_ADMIN") {
    redirect(user.role === "ADMIN" ? "/admin" : "/");
  }
  return (
    <AdminShell
      userName={user.name}
      userEmail={user.email}
      isSuperAdmin
    >
      {children}
    </AdminShell>
  );
}
