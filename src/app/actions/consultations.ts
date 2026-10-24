"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  createConsultation,
  startConsultationPayment,
  updateConsultation,
} from "@/services/consultations";

export type ConsultationActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function requestConsultationAction(
  _prev: ConsultationActionResult | null,
  formData: FormData,
): Promise<ConsultationActionResult> {
  const user = await getSessionUser();
  const preferredRaw = String(formData.get("preferredAt") || "");
  try {
    await createConsultation({
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || "") || null,
      topic: String(formData.get("topic") || ""),
      message: String(formData.get("message") || ""),
      packageId: String(formData.get("packageId") || "basic"),
      preferredAt: preferredRaw ? new Date(preferredRaw) : null,
      userId: user?.id ?? null,
    });
    revalidatePath("/admin/consultations");
    revalidatePath("/admin");
    revalidatePath("/consultations");
    return { ok: true, message: "Consultation request submitted." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not submit request",
    };
  }
}

export async function updateConsultationAction(
  _prev: ConsultationActionResult | null,
  formData: FormData,
): Promise<ConsultationActionResult> {
  const user = await getSessionUser();
  const id = String(formData.get("id") || "");
  const scheduledRaw = String(formData.get("scheduledAt") || "");
  try {
    await updateConsultation(user, id, {
      status: String(formData.get("status") || "PENDING") as
        | "PENDING"
        | "CONFIRMED"
        | "COMPLETED"
        | "CANCELLED",
      scheduledAt: scheduledRaw ? new Date(scheduledRaw) : null,
      adminNotes: String(formData.get("adminNotes") || "") || null,
      assigneeId: user?.id ?? null,
    });
    revalidatePath("/admin/consultations");
    revalidatePath("/admin");
    return { ok: true, message: "Consultation updated." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Update failed",
    };
  }
}

export async function payConsultationAction(formData: FormData) {
  const user = await getSessionUser();
  const id = String(formData.get("id") || "");
  const result = await startConsultationPayment(user, id);
  if (!result.ok) {
    redirect(
      `/admin/consultations?error=${encodeURIComponent(result.reason)}`,
    );
  }
  redirect(result.authorizationUrl);
}
