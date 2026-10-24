"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";
import {
  advanceOrderFulfillment,
  confirmBankTransferPayment,
  reportBankTransfer,
} from "@/services/orders";

export type PaymentActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function reportTransferAction(
  _prev: PaymentActionResult | null,
  formData: FormData,
): Promise<PaymentActionResult> {
  const orderNumber = String(formData.get("orderNumber") || "");
  const transferRef = String(formData.get("transferRef") || "");
  const paidVia = String(formData.get("paidVia") || "");
  const accountId = String(formData.get("accountId") || "uba");
  const proof = formData.get("proof");

  if (!(proof instanceof File) || proof.size <= 0) {
    return {
      ok: false,
      error: "Upload a clear screenshot of your transfer receipt.",
    };
  }

  const uploaded = await saveUpload(proof, { folder: "payment-proofs" });
  if (!uploaded.ok) {
    return { ok: false, error: uploaded.reason };
  }

  const result = await reportBankTransfer({
    orderNumber,
    transferRef,
    paidVia,
    accountId,
    proofUrl: uploaded.url,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/order-confirmation/${orderNumber}`);
  revalidatePath(`/account/orders/${orderNumber}`);
  revalidatePath("/admin/orders");
  return {
    ok: true,
    message:
      "Proof received. We will approve your payment before packing and delivery.",
  };
}

export async function confirmTransferAction(
  _prev: PaymentActionResult | null,
  formData: FormData,
): Promise<PaymentActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return { ok: false, error: "Admin access required." };
  }

  const orderId = String(formData.get("orderId") || "");
  const note = String(formData.get("note") || "") || undefined;
  if (!orderId) return { ok: false, error: "Missing order." };

  const result = await confirmBankTransferPayment({
    orderId,
    adminUserId: user.id,
    note,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/admin/orders");
  revalidatePath(`/order-confirmation/${result.order.orderNumber}`);
  revalidatePath(`/account/orders/${result.order.orderNumber}`);
  return {
    ok: true,
    message: `Payment approved for ${result.order.orderNumber}. Delivery ETA is set.`,
  };
}

export async function advanceFulfillmentAction(
  _prev: PaymentActionResult | null,
  formData: FormData,
): Promise<PaymentActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return { ok: false, error: "Admin access required." };
  }

  const orderId = String(formData.get("orderId") || "");
  const status = String(formData.get("status") || "") as
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED";
  if (!orderId || !["PROCESSING", "SHIPPED", "DELIVERED"].includes(status)) {
    return { ok: false, error: "Invalid fulfillment update." };
  }

  const result = await advanceOrderFulfillment({
    orderId,
    adminUserId: user.id,
    status,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/admin/orders");
  revalidatePath(`/account/orders/${result.order.orderNumber}`);
  revalidatePath(`/order-confirmation/${result.order.orderNumber}`);
  return { ok: true, message: `Order marked ${status}.` };
}
