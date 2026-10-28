"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { siteUrl, paymentsConfigured } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { formatMoney } from "@/lib/money";
import { initializePayment } from "@/lib/payments/adapter";
import {
  paymentMethodById,
  type PaymentMethodId,
} from "@/lib/payments/methods";
import {
  bankTransferAvailable,
  getSettlementAccounts,
  transferNarration,
} from "@/lib/payments/settlement";
import { createOrderFromCart } from "@/services/orders";

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
  paymentMethod: z.enum(["opay", "uba", "bank", "other_wallet"]),
  confirmSummary: z.literal("yes"),
});

export type CheckoutResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string };

export async function placeOrderAction(
  _prev: CheckoutResult | null,
  formData: FormData,
): Promise<CheckoutResult> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?callbackUrl=/checkout");
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
    guestEmail: user.email,
    paymentMethod: formData.get("paymentMethod") || "uba",
    confirmSummary: formData.get("confirmSummary") || "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error:
        "Confirm the order summary, choose a payment method, and complete shipping details.",
    };
  }

  const method = paymentMethodById(parsed.data.paymentMethod);
  if (!method) {
    return { ok: false, error: "Select a supported payment method." };
  }

  const useHosted = paymentsConfigured();
  if (!useHosted && !bankTransferAvailable()) {
    return { ok: false, error: "Payments are temporarily unavailable." };
  }

  const { expireStaleUnpaidOrders } = await import("@/services/orders");
  await expireStaleUnpaidOrders(48).catch(() => 0);

  const idempotencyKey =
    String(formData.get("idempotencyKey") || "") || randomUUID();

  let order;
  try {
    order = await createOrderFromCart({
      shippingName: parsed.data.shippingName,
      shippingLine1: parsed.data.shippingLine1,
      shippingLine2: parsed.data.shippingLine2,
      shippingCity: parsed.data.shippingCity,
      shippingState: parsed.data.shippingState,
      shippingPostal: parsed.data.shippingPostal,
      shippingCountry: parsed.data.shippingCountry,
      shippingPhone: parsed.data.shippingPhone,
      guestEmail: parsed.data.guestEmail,
      idempotencyKey,
      userId: user.id,
      guestKey: null,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not place order",
    };
  }

  const paymentIdempotency = `pay-${order.id}`;
  const existing = await prisma.payment.findUnique({
    where: { idempotencyKey: paymentIdempotency },
  });

  // Hosted PSP checkout when keys are configured
  if (useHosted) {
    const reference = `eshop-${order.orderNumber}-${Date.now().toString(36)}`;
    const init = await initializePayment({
      amountMinor: order.totalMinor,
      currency: order.currency,
      email: user.email,
      reference,
      callbackUrl: siteUrl(`/order-confirmation/${order.orderNumber}`),
      metadata: {
        type: "order",
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: method.id,
      },
    });

    if (!init.ok) {
      return { ok: false, error: init.reason };
    }

    if (!existing) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "paystack",
          providerRef: init.reference,
          amountMinor: order.totalMinor,
          currency: order.currency,
          status: "REQUIRES_ACTION",
          idempotencyKey: paymentIdempotency,
          rawMetaJson: JSON.stringify({
            method: method.id,
            channelLabel: method.label,
            authorizationUrl: init.authorizationUrl,
          }),
        },
      });
    } else {
      await prisma.payment.update({
        where: { id: existing.id },
        data: {
          provider: "paystack",
          providerRef: init.reference,
          status: "REQUIRES_ACTION",
          rawMetaJson: JSON.stringify({
            method: method.id,
            channelLabel: method.label,
            authorizationUrl: init.authorizationUrl,
          }),
        },
      });
    }

    void sendEmail({
      to: user.email,
      subject: `Complete payment for ${order.orderNumber}`,
      html: `<p>Order <strong>${order.orderNumber}</strong> is ready.</p><p>Pay ${formatMoney(order.totalMinor, order.currency)} via ${method.label}.</p><p><a href="${init.authorizationUrl}">Open checkout</a></p>`,
      text: `Pay ${order.orderNumber} via ${init.authorizationUrl}`,
    }).catch(() => undefined);

    redirect(init.authorizationUrl);
  }

  // Settlement transfer path (OPay / UBA / banks) — payment request in DB
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
          method: method.id as PaymentMethodId,
          channelLabel: method.label,
          preferredAccountId: method.preferredAccountId,
          channels: method.apps,
        }),
      },
    });
  }

  const accounts = getSettlementAccounts();
  const preferred =
    accounts.find((a) => a.id === method.preferredAccountId) ?? accounts[0];
  const accountLines = accounts
    .map(
      (a) =>
        `<li><strong>${a.bank}</strong> ${a.accountNumber} — ${a.accountName}</li>`,
    )
    .join("");

  void sendEmail({
    to: user.email,
    subject: `Pay for order ${order.orderNumber}`,
    html: `
      <p>Thanks for your order <strong>${order.orderNumber}</strong>.</p>
      <p>Amount due: <strong>${formatMoney(order.totalMinor, order.currency)}</strong></p>
      <p>Selected method: <strong>${method.label}</strong>${
        preferred
          ? ` — prefer <strong>${preferred.bank}</strong> ${preferred.accountNumber}`
          : ""
      }</p>
      <p>Transfer to:</p>
      <ul>${accountLines}</ul>
      <p>Narration: <strong>${transferNarration(order.orderNumber)}</strong></p>
      <p>We confirm the order only after payment is verified.</p>
    `,
    text: `Pay ${formatMoney(order.totalMinor, order.currency)} for ${order.orderNumber} via ${method.label}. Narration: ${transferNarration(order.orderNumber)}`,
  }).catch(() => undefined);

  const qs = new URLSearchParams({
    pay: "bank",
    method: method.id,
  });
  if (method.preferredAccountId) {
    qs.set("account", method.preferredAccountId);
  }
  redirect(`/order-confirmation/${order.orderNumber}?${qs.toString()}`);
}
