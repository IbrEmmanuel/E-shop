import { headers } from "next/headers";
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
  const h = await headers();
  const pathname = h.get("x-pathname") || "";
  const isApply =
    pathname === "/vendor/apply" || pathname.startsWith("/vendor/apply/");

  const user = await getSessionUser();
  if (!user) {
    redirect(
      isApply
        ? `/login?callbackUrl=${encodeURIComponent(pathname || "/vendor/apply")}`
        : "/login?callbackUrl=/vendor",
    );
  }

  // Applicants (CUSTOMER) must reach the apply wizard; desk stays gated.
  if (
    !isApply &&
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
    if (isApply) {
      return <>{children}</>;
    }
    if (isStaffRole(user.role)) {
      return (
        <VendorShell storeName="Platform inspection" email={user.email}>
          {children}
        </VendorShell>
      );
    }
    return <>{children}</>;
  }

  if (isApply) {
    return <>{children}</>;
  }

  return (
    <VendorShell storeName={vendor.storeName} email={user.email}>
      {children}
    </VendorShell>
  );
}
