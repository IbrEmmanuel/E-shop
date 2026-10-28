"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

export type ProfileActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function updateProfileAction(
  _prev: ProfileActionResult | null,
  formData: FormData,
): Promise<ProfileActionResult> {
  const session = await getSessionUser();
  try {
    const user = requireAuth(session);
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const phone = String(formData.get("phone") || "").trim() || null;
    if (!firstName || !lastName) {
      return { ok: false, error: "First and last name are required." };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
      },
    });

    await prisma.customerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, phone },
      update: { phone },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "profile.updated",
      entityType: "User",
      entityId: user.id,
    });

    revalidatePath("/admin/profile");
    revalidatePath("/account");
    revalidatePath("/account/profile");
    return { ok: true, message: "Profile saved." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save profile",
    };
  }
}

export async function savePreferencesAction(
  _prev: ProfileActionResult | null,
  formData: FormData,
): Promise<ProfileActionResult> {
  const session = await getSessionUser();
  try {
    const user = requireAuth(session);
    const emailAlerts = formData.get("emailAlerts") === "on";
    const smsAlerts = formData.get("smsAlerts") === "on";
    await prisma.user.update({
      where: { id: user.id },
      data: { emailAlerts, smsAlerts },
    });
    revalidatePath("/admin/profile");
    revalidatePath("/account/profile");
    return { ok: true, message: "Preferences saved." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save preferences",
    };
  }
}

export async function addAddressAction(
  _prev: ProfileActionResult | null,
  formData: FormData,
): Promise<ProfileActionResult> {
  const session = await getSessionUser();
  try {
    const user = requireAuth(session);
    const fullName = String(formData.get("fullName") || "").trim();
    const line1 = String(formData.get("line1") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const phone = String(formData.get("phone") || "").trim() || null;
    const state = String(formData.get("state") || "").trim() || null;
    if (!fullName || !line1 || !city) {
      return { ok: false, error: "Name, address line, and city are required." };
    }
    await prisma.address.create({
      data: {
        userId: user.id,
        fullName,
        line1,
        line2: String(formData.get("line2") || "").trim() || null,
        city,
        state,
        postalCode: String(formData.get("postalCode") || "").trim() || null,
        phone,
        country: "NG",
      },
    });
    revalidatePath("/admin/profile");
    revalidatePath("/account/addresses");
    return { ok: true, message: "Address saved." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save address",
    };
  }
}

export async function deleteAddressAction(formData: FormData) {
  const session = await getSessionUser();
  const user = requireAuth(session);
  const addressId = String(formData.get("addressId") || "");
  if (!addressId) return;

  await prisma.address.deleteMany({
    where: { id: addressId, userId: user.id },
  });

  revalidatePath("/admin/profile");
  revalidatePath("/account/addresses");
}

export async function changePasswordAction(
  _prev: ProfileActionResult | null,
  formData: FormData,
): Promise<ProfileActionResult> {
  const session = await getSessionUser();
  try {
    const user = requireAuth(session);
    const schema = z
      .object({
        currentPassword: z.string().min(8),
        newPassword: z.string().min(8).max(128),
        confirmPassword: z.string().min(8).max(128),
      })
      .refine((v) => v.newPassword === v.confirmPassword, {
        message: "New passwords do not match",
      });

    const parsed = schema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message || "Invalid password form",
      };
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.passwordHash) {
      return { ok: false, error: "Password login is not configured." };
    }

    const valid = await bcrypt.compare(
      parsed.data.currentPassword,
      dbUser.passwordHash,
    );
    if (!valid) return { ok: false, error: "Current password is incorrect." };

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "profile.password_changed",
      entityType: "User",
      entityId: user.id,
    });

    return { ok: true, message: "Password updated." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not change password",
    };
  }
}
