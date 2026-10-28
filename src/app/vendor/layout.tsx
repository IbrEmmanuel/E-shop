import { redirect } from "next/navigation";
import { VendorShell } from "@/components/vendor/vendor-shell";
import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";
import { prisma } from "@/lib/db";
import "../(public)/account/account.css";

export const dynamic = "force-dynamic";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?callbackUrl=/vendor");
  }

  if (
    user.role !== "VENDOR" &&
    !isStaffRole(user.role)
  ) {
    redirect("/sell");
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
  });

  // Apply flow and staff inspect without a personal shop — render children;
  // pages that need a Vendor row redirect themselves.
  if (!vendor) {
    if (isStaffRole(user.role)) {
      return (
        <VendorShell storeName="Platform inspection" email={user.email}>
          {children}
        </VendorShell>
      );
    }
    return <>{children}</>;
  }

  return (
    <VendorShell storeName={vendor.storeName} email={user.email}>
      {children}
    </VendorShell>
  );
}
