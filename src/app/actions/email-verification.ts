"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  confirmEmailVerification,
  sendEmailVerification,
} from "@/services/email-verification";

export type VerifyActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function sendVerificationEmailAction(
  _prev: VerifyActionResult | null,
  _formData: FormData,
): Promise<VerifyActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required." };
  try {
    await sendEmailVerification(user.email);
    return {
      ok: true,
      message: "Verification link sent. Check your inbox (or admin email outbox).",
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not send email",
    };
  }
}

export async function confirmVerificationAction(
  _prev: VerifyActionResult | null,
  formData: FormData,
): Promise<VerifyActionResult> {
  const email = String(formData.get("email") || "");
  const token = String(formData.get("token") || "");
  const result = await confirmEmailVerification(email, token);
  if (!result.ok) return result;
  redirect("/vendor/apply?verified=1");
}
