"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { parseMoneyToMinor } from "@/lib/money";
import { requestPayout, reviewPayoutRequest } from "@/services/wallet";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function requestPayoutAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  try {
    const amountMinor = parseMoneyToMinor(String(formData.get("amount") || ""));
    await requestPayout(user, {
      amountMinor,
      bankName: String(formData.get("bankName") || ""),
      accountName: String(formData.get("accountName") || ""),
      accountNumber: String(formData.get("accountNumber") || ""),
    });
    revalidatePath("/vendor/payouts");
    revalidatePath("/vendor/earnings");
    revalidatePath("/admin/vendors/payouts");
    return { ok: true, message: "Payout request submitted." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not request payout",
    };
  }
}

export async function reviewPayoutAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  const payoutId = String(formData.get("payoutId") || "");
  const decision = String(formData.get("decision") || "") as
    | "APPROVED"
    | "REJECTED";
  const adminNote = String(formData.get("adminNote") || "") || undefined;
  if (!payoutId || !["APPROVED", "REJECTED"].includes(decision)) {
    return { ok: false, error: "Invalid payout review." };
  }
  try {
    await reviewPayoutRequest(user, { payoutId, decision, adminNote });
    revalidatePath("/admin/vendors/payouts");
    revalidatePath("/admin/vendors/wallet");
    revalidatePath("/vendor/payouts");
    revalidatePath("/vendor/earnings");
    return {
      ok: true,
      message:
        decision === "APPROVED" ? "Payout approved." : "Payout rejected.",
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not review payout",
    };
  }
}
