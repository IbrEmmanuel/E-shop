import { createHmac, timingSafeEqual } from "crypto";
import { paymentsConfigured } from "@/lib/env";

export type InitializePaymentInput = {
  amountMinor: number;
  currency: string;
  email: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
};

export type InitializePaymentResult =
  | {
      ok: true;
      authorizationUrl: string;
      reference: string;
      provider: "paystack";
    }
  | { ok: false; reason: string };

export type VerifyPaymentResult =
  | {
      ok: true;
      reference: string;
      amountMinor: number;
      currency: string;
      status: "success" | "failed" | "abandoned";
      raw: unknown;
    }
  | { ok: false; reason: string };

/**
 * Paystack adapter. Never marks payments successful without API verification.
 */
export async function initializePayment(
  input: InitializePaymentInput,
): Promise<InitializePaymentResult> {
  if (!paymentsConfigured()) {
    return {
      ok: false,
      reason:
        "PAYMENT_SECRET_KEY is not configured. Add Paystack keys to .env — payments will not be simulated.",
    };
  }

  const secret = process.env.PAYMENT_SECRET_KEY!;
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountMinor,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
      // Card + Nigerian bank / fintech rails (OPay, Moniepoint, PalmPay, USSD, transfer)
      channels: [
        "card",
        "bank",
        "ussd",
        "qr",
        "mobile_money",
        "bank_transfer",
      ],
    }),
  });

  const data = (await res.json()) as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; reference: string };
  };

  if (!res.ok || !data.status || !data.data) {
    return { ok: false, reason: data.message || "Paystack initialize failed" };
  }

  return {
    ok: true,
    authorizationUrl: data.data.authorization_url,
    reference: data.data.reference,
    provider: "paystack",
  };
}

export async function verifyPayment(
  reference: string,
): Promise<VerifyPaymentResult> {
  if (!paymentsConfigured()) {
    return {
      ok: false,
      reason: "PAYMENT_SECRET_KEY is not configured",
    };
  }

  const secret = process.env.PAYMENT_SECRET_KEY!;
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
    },
  );
  const data = (await res.json()) as {
    status: boolean;
    message: string;
    data?: {
      reference: string;
      amount: number;
      currency: string;
      status: string;
    };
  };

  if (!res.ok || !data.status || !data.data) {
    return { ok: false, reason: data.message || "Verification failed" };
  }

  const statusMap: Record<string, "success" | "failed" | "abandoned"> = {
    success: "success",
    failed: "failed",
    abandoned: "abandoned",
  };

  return {
    ok: true,
    reference: data.data.reference,
    amountMinor: data.data.amount,
    currency: data.data.currency,
    status: statusMap[data.data.status] ?? "failed",
    raw: data.data,
  };
}

export function verifyPaystackWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.PAYMENT_SECRET_KEY;
  if (!secret || !signature) return false;
  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(hash);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
