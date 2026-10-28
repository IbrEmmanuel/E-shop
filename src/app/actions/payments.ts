"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";
import { parseMoneyToMinor } from "@/lib/money";
import {
  advanceOrderFulfillment,
  cancelUnpaidOrder,
  confirmBankTransferPayment,
  confirmDeliveryByCustomer,
  expireStaleUnpaidOrders,
  refundOrder,
  reportBankTransfer,
} from "@/services/orders";

export type PaymentActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function reportTransferAction(
  _prev: PaymentActionResult | null,
  formData: FormData,
): Promise<PaymentActionResult> {
  try {
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
  } catch (e) {
    console.error("[payment:report-transfer]", e);
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Could not upload payment proof. Try a smaller image.",
    };
  }
}

export async function confirmTransferAction(
  _prev: PaymentActionResult | null,
  formData: FormData,
): Promise<PaymentActionResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return { ok: false, error: "Admin access required." };
  }

  const orderId = String(formData.get("orderId") || "");
  const note = String(formData.get("note") || "") || undefined;
  if (!orderId) return { ok: false, error: "Missing order." };

  let verifiedAmountMinor: number | undefined;
  const amountRaw = String(formData.get("verifiedAmount") || "").trim();
  if (amountRaw) {
    try {
      verifiedAmountMinor = parseMoneyToMinor(amountRaw);
    } catch {
      return { ok: false, error: "Invalid verified amount." };
    }
  }
  const verifiedTransferRef =
    String(formData.get("verifiedTransferRef") || "").trim() || undefined;

  // Release abandoned carts' holds before approving new work
  await expireStaleUnpaidOrders(48).catch(() => 0);

  const result = await confirmBankTransferPayment({
    orderId,
    adminUserId: user.id,
    note,
    verifiedAmountMinor,
    verifiedTransferRef,
  });

  if (!result.ok) {
    revalidatePath("/admin/orders");
    revalidatePath("/admin/payments");
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/vendor/orders");
  revalidatePath(`/order-confirmation/${result.order.orderNumber}`);
  revalidatePath(`/account/orders/${result.order.orderNumber}`);
  return {
    ok: true,
    message: `Payment approved for ${result.order.orderNumber}. Vendors notified.`,
  };
}

export async function cancelUnpaidOrderAction(
  _prev: PaymentActionResult | null,
  formData: FormData,
): Promise<PaymentActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return { ok: false, error: "Missing order." };

  const order = await (
    await import("@/lib/db")
  ).prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found." };
  if ((user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") && order.userId !== user.id) {
    return { ok: false, error: "Not allowed." };
  }

  const result = await cancelUnpaidOrder({
    orderId,
    actorId: user.id,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${result.order.orderNumber}`);
  revalidatePath("/admin/orders");
  return {
    ok: true,
    message: `Cancelled ${result.order.orderNumber}. Stock released.`,
  };
}

export async function confirmDeliveryAction(
  _prev: PaymentActionResult | null,
  formData: FormData,
): Promise<PaymentActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return { ok: false, error: "Missing order." };

  const result = await confirmDeliveryByCustomer({
    orderId,
    userId: user.id,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/account/orders/${result.order.orderNumber}`);
  revalidatePath("/account/orders");
  revalidatePath("/vendor/earnings");
  return {
    ok: true,
    message: "Delivery confirmed. Thank you!",
  };
}

export async function advanceFulfillmentAction(
  _prev: PaymentActionResult | null,
  formData: FormData,
): Promise<PaymentActionResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
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

export async function refundOrderAction(
  _prev: PaymentActionResult | null,
  formData: FormData,
): Promise<PaymentActionResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return { ok: false, error: "Admin access required." };
  }

  const orderId = String(formData.get("orderId") || "");
  const note = String(formData.get("note") || "") || undefined;
  if (!orderId) return { ok: false, error: "Missing order." };

  const result = await refundOrder({
    orderId,
    adminUserId: user.id,
    note,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/admin/orders");
  revalidatePath("/admin/vendors/wallet");
  revalidatePath(`/account/orders/${result.order.orderNumber}`);
  revalidatePath("/vendor/earnings");
  return {
    ok: true,
    message: `Refunded ${result.order.orderNumber}. Inventory restored.`,
  };
}
