"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGuestKey } from "@/lib/guest";
import { bankTransferAvailable } from "@/lib/payments/settlement";
import { createOrderFromCart } from "@/services/orders";
import { sendEmail } from "@/lib/email";
import { formatMoney } from "@/lib/money";
import { getSettlementAccounts, transferNarration } from "@/lib/payments/settlement";

const schema = z.object({
  shippingName: z.string().trim().min(1),
  shippingLine1: z.string().trim().min(1),
  shippingLine2: z.string().trim().optional().nullable(),
  shippingCity: z.string().trim().min(1),
  shippingState: z.string().trim().optional().nullable(),
  shippingPostal: z.string().trim().optional().nullable(),
  shippingCountry: z.string().trim().min(2).max(2).default("NG"),
  shippingPhone: z.string().trim().optional().nullable(),
  guestEmail: z.string().email().optional().nullable(),
});

export type CheckoutResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string };

export async function placeOrderAction(
  _prev: CheckoutResult | null,
  formData: FormData,
): Promise<CheckoutResult> {
  const user = await getSessionUser();
  const guestKey = user ? null : await getGuestKey();
  if (!user && !guestKey) {
    return { ok: false, error: "Your cart session expired. Add items again." };
  }

  const parsed = schema.safeParse({
    shippingName: formData.get("shippingName"),
    shippingLine1: formData.get("shippingLine1"),
    shippingLine2: formData.get("shippingLine2") || null,
    shippingCity: formData.get("shippingCity"),
    shippingState: formData.get("shippingState") || null,
    shippingPostal: formData.get("shippingPostal") || null,
    shippingCountry: formData.get("shippingCountry") || "NG",
    shippingPhone: formData.get("shippingPhone") || null,
    guestEmail: formData.get("guestEmail") || user?.email || null,
  });

  if (!parsed.success) {
    return { ok: false, error: "Please complete the shipping details." };
  }

  if (!user && !parsed.data.guestEmail) {
    return { ok: false, error: "Email is required for guest checkout." };
  }

  if (!bankTransferAvailable()) {
    return { ok: false, error: "Bank transfer accounts are not configured." };
  }

  const idempotencyKey =
    String(formData.get("idempotencyKey") || "") || randomUUID();

  let order;
  try {
    order = await createOrderFromCart({
      ...parsed.data,
      idempotencyKey,
      userId: user?.id,
      guestKey,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not place order",
    };
  }

  const email = user?.email || parsed.data.guestEmail!;
  const paymentIdempotency = `pay-${order.id}`;
  const existing = await prisma.payment.findUnique({
    where: { idempotencyKey: paymentIdempotency },
  });

  if (!existing) {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "bank_transfer",
        amountMinor: order.totalMinor,
        currency: order.currency,
        status: "PENDING",
        idempotencyKey: paymentIdempotency,
        rawMetaJson: JSON.stringify({
          method: "bank_transfer",
          channels: ["OPay", "Moniepoint", "PalmPay", "UBA", "bank"],
        }),
      },
    });
  }

  const accounts = getSettlementAccounts();
  const accountLines = accounts
    .map(
      (a) =>
        `<li><strong>${a.bank}</strong> ${a.accountNumber} — ${a.accountName}</li>`,
    )
    .join("");

  void sendEmail({
    to: email,
    subject: `Pay for order ${order.orderNumber}`,
    html: `
      <p>Thanks for your order <strong>${order.orderNumber}</strong>.</p>
      <p>Amount due: <strong>${formatMoney(order.totalMinor, order.currency)}</strong></p>
      <p>Transfer from OPay, Moniepoint, PalmPay, or any bank to:</p>
      <ul>${accountLines}</ul>
      <p>Use narration / remark: <strong>${transferNarration(order.orderNumber)}</strong></p>
    `,
    text: `Pay ${formatMoney(order.totalMinor, order.currency)} for ${order.orderNumber}. Narration: ${transferNarration(order.orderNumber)}`,
  }).catch(() => undefined);

  redirect(`/order-confirmation/${order.orderNumber}?pay=bank`);
}
