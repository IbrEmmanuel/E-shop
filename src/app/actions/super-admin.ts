"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export type SuperActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const ASSIGNABLE: Role[] = ["CUSTOMER", "VENDOR", "ADMIN", "SUPER_ADMIN"];

export async function setUserRoleAction(
  _prev: SuperActionResult | null,
  formData: FormData,
): Promise<SuperActionResult> {
  try {
    const actor = requireSuperAdmin(await getSessionUser());
    const userId = String(formData.get("userId") || "").trim();
    const role = String(formData.get("role") || "").trim() as Role;
    if (!userId || !ASSIGNABLE.includes(role)) {
      return { ok: false, error: "Invalid user or role." };
    }
    if (userId === actor.id && role !== "SUPER_ADMIN") {
      return { ok: false, error: "You cannot demote your own super-admin account." };
    }
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return { ok: false, error: "User not found." };

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    await writeAuditLog({
      actorId: actor.id,
      action: "user.role.changed",
      entityType: "User",
      entityId: userId,
      meta: { from: target.role, to: role },
    });
    revalidatePath("/super");
    revalidatePath("/super/admins");
    revalidatePath("/admin/customers");
    return {
      ok: true,
      message: `${target.email} is now ${role.replaceAll("_", " ")}.`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update role.",
    };
  }
}

export async function setUserStatusAction(
  _prev: SuperActionResult | null,
  formData: FormData,
): Promise<SuperActionResult> {
  try {
    const actor = requireSuperAdmin(await getSessionUser());
    const userId = String(formData.get("userId") || "").trim();
    const status = String(formData.get("status") || "").trim();
    if (!userId || !["ACTIVE", "DISABLED"].includes(status)) {
      return { ok: false, error: "Invalid user or status." };
    }
    if (userId === actor.id) {
      return { ok: false, error: "You cannot disable your own account." };
    }
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return { ok: false, error: "User not found." };

    await prisma.user.update({
      where: { id: userId },
      data: { status },
    });
    await writeAuditLog({
      actorId: actor.id,
      action: "user.status.changed",
      entityType: "User",
      entityId: userId,
      meta: { from: target.status, to: status },
    });
    revalidatePath("/super/admins");
    return {
      ok: true,
      message: `${target.email} marked ${status}.`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update status.",
    };
  }
}
