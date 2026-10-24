import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPaystackWebhookSignature } from "@/lib/payments/adapter";
import { markOrderPaidFromProvider } from "@/services/orders";
import { confirmRentalPaymentFromProvider } from "@/services/rentals";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    event?: string;
    data?: {
      id?: number | string;
      reference?: string;
      metadata?: { type?: string; orderId?: string; rentalId?: string };
    };
  };

  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.event || "unknown";
  const eventId = String(
    payload.data?.id ?? payload.data?.reference ?? `${eventType}-${Date.now()}`,
  );
  const reference = payload.data?.reference;

  const existing = await prisma.paymentWebhookEvent.findUnique({
    where: { provider_eventId: { provider: "paystack", eventId } },
  });
  if (existing?.processedAt) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  const eventRow =
    existing ??
    (await prisma.paymentWebhookEvent.create({
      data: {
        provider: "paystack",
        eventId,
        eventType,
        payloadJson: rawBody,
      },
    }));

  if (eventType === "charge.success" && reference) {
    const metaType = payload.data?.metadata?.type;
    let result: { ok: boolean; reason?: string };

    if (metaType === "rental") {
      result = await confirmRentalPaymentFromProvider({ providerRef: reference });
    } else {
      // Try order payment first; fall back to rental if no order payment
      result = await markOrderPaidFromProvider({ providerRef: reference });
      if (!result.ok) {
        const rentalTry = await confirmRentalPaymentFromProvider({
          providerRef: reference,
        });
        if (rentalTry.ok) result = rentalTry;
      }
    }

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: 422 },
      );
    }
  }

  await prisma.paymentWebhookEvent.update({
    where: { id: eventRow.id },
    data: { processedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
