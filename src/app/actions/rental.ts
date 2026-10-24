"use server";

import { getSessionUser } from "@/lib/auth";
import { bankTransferAvailable } from "@/lib/payments/settlement";

export type RentCheckoutResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Monthly rent is collected via the same UBA / OPay bank-transfer rails.
 * Instructions are shown from Admin → Vendor → Settings.
 */
export async function startRentCheckoutAction(
  ..._args: [RentCheckoutResult | null, FormData?]
): Promise<RentCheckoutResult> {
  void _args;
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Sign in to renew your shop rental." };
  }
  if (!bankTransferAvailable()) {
    return {
      ok: false,
      error: "Settlement accounts are not configured. Contact support.",
    };
  }

  return {
    ok: true,
    message:
      "Transfer your monthly rent to the UBA or OPay account shown on Settings / order payment screens, then message support with your transfer reference. Admin will activate your rental period.",
  };
}
