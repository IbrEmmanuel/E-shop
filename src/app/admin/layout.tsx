import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { getSessionUser } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (user.role !== "ADMIN") redirect("/");
  return (
    <AdminShell userName={user.name} userEmail={user.email}>
      {children}
    </AdminShell>
  );
}
