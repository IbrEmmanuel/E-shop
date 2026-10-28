"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import {
  bankTransferAvailable,
  getSettlementAccounts,
} from "@/lib/payments/settlement";
import { paymentsConfigured } from "@/lib/env";
import {
  adminConfirmBankRentPayment,
  createBankRentInvoice,
  initializeMonthlyRentPayment,
} from "@/services/rentals";

export type RentCheckoutResult =
  | {
      ok: true;
      message: string;
      reference?: string;
      authorizationUrl?: string;
    }
  | { ok: false; error: string };

/**
 * Start monthly rent: bank-transfer invoice (default) or Paystack hosted checkout
 * when PAYMENT_SECRET_KEY is configured and ?provider=paystack is requested.
 */
export async function startRentCheckoutAction(
  _prev: RentCheckoutResult | null,
  formData?: FormData,
): Promise<RentCheckoutResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Sign in to renew your shop rental." };
  }

  const vendorId = String(formData?.get("vendorId") || "").trim() || undefined;
  const preferPaystack =
    String(formData?.get("provider") || "").toLowerCase() === "paystack";

  if (preferPaystack && paymentsConfigured()) {
    const init = await initializeMonthlyRentPayment(user, {});
    if (!init.ok) return { ok: false, error: init.reason };
    revalidatePath("/admin/vendors/settings");
    revalidatePath("/vendor");
    return {
      ok: true,
      message: "Redirecting to Paystack to complete this month's rent.",
      authorizationUrl: init.authorizationUrl,
      reference: init.reference,
    };
  }

  if (!bankTransferAvailable()) {
    return {
      ok: false,
      error: "Settlement accounts are not configured. Contact support.",
    };
  }

  const invoice = await createBankRentInvoice(user, vendorId);
  if (!invoice.ok) return { ok: false, error: invoice.reason };

  const accounts = getSettlementAccounts()
    .map((a) => `${a.bank} ${a.accountNumber} (${a.accountName})`)
    .join(" · ");

  revalidatePath("/admin/vendors/settings");
  revalidatePath("/vendor");

  return {
    ok: true,
    reference: invoice.reference,
    message: `Transfer ${formatMoney(invoice.amountMinor, invoice.currency)} to ${accounts}. Use narration ${invoice.reference}. After transfer, admin will confirm and activate your rental period.`,
  };
}

export type ConfirmRentResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function adminConfirmRentPaymentAction(
  _prev: ConfirmRentResult | null,
  formData: FormData,
): Promise<ConfirmRentResult> {
  const user = await getSessionUser();
  const paymentId = String(formData.get("paymentId") || "").trim();
  if (!paymentId) return { ok: false, error: "Payment id required" };

  const result = await adminConfirmBankRentPayment(user, paymentId);
  if (!result.ok) return { ok: false, error: result.reason };

  revalidatePath("/admin/vendors/settings");
  revalidatePath("/admin/vendors");
  revalidatePath("/vendor");
  return { ok: true, message: "Rent marked paid. Rental period extended." };
}
