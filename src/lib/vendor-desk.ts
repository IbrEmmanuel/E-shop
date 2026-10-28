import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/roles";
import type { Role } from "@/lib/types";

/**
 * Resolve which vendor desk a user may inspect.
 * Staff may pass vendorId to open another seller's desk when authorised.
 */
export async function resolveVendorDesk(opts: {
  userId: string;
  role: Role | string;
  vendorId?: string | null;
}) {
  const requested = opts.vendorId?.trim() || null;

  if (requested && isStaffRole(opts.role)) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: requested },
      include: { rental: { include: { plan: true } } },
    });
    if (!vendor) return { ok: false as const, error: "Vendor not found" };
    return { ok: true as const, vendor, inspecting: true as const };
  }

  const own = await prisma.vendor.findUnique({
    where: { userId: opts.userId },
    include: { rental: { include: { plan: true } } },
  });
  if (!own) return { ok: false as const, error: "no-vendor" };
  return { ok: true as const, vendor: own, inspecting: false as const };
}

export function vendorDeskQuery(vendorId: string | null | undefined, inspecting: boolean) {
  if (!inspecting || !vendorId) return "";
  return `?vendorId=${encodeURIComponent(vendorId)}`;
}
