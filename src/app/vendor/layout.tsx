import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { VendorShell } from "@/components/vendor/vendor-shell";
import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";
import { resolveVendorDesk } from "@/lib/vendor-desk";
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
  const search = h.get("x-search") || "";
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
  if (!isApply && user.role !== "VENDOR" && !isStaffRole(user.role)) {
    redirect("/sell");
  }

  if (isApply) {
    return <>{children}</>;
  }

  const inspectId = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  ).get("vendorId");

  const desk = await resolveVendorDesk({
    userId: user.id,
    role: user.role,
    vendorId: inspectId,
  });

  if (desk.ok) {
    return (
      <Suspense fallback={null}>
        <VendorShell
          storeName={
            desk.inspecting
              ? `${desk.vendor.storeName} (inspect)`
              : desk.vendor.storeName
          }
          email={user.email}
          storeSlug={desk.vendor.slug}
        >
          {children}
        </VendorShell>
      </Suspense>
    );
  }

  // Staff without a personal shop and without vendorId — inspection chrome.
  if (isStaffRole(user.role)) {
    return (
      <Suspense fallback={null}>
        <VendorShell storeName="Platform inspection" email={user.email}>
          {children}
        </VendorShell>
      </Suspense>
    );
  }

  // Applicant with no Vendor row yet — pages redirect to apply.
  const own = await prisma.vendor.findUnique({ where: { userId: user.id } });
  if (!own) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={null}>
      <VendorShell
        storeName={own.storeName}
        email={user.email}
        storeSlug={own.slug}
      >
        {children}
      </VendorShell>
    </Suspense>
  );
}
