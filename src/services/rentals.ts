import { randomUUID } from "crypto";
import { z } from "zod";
import type { RentalPayment, VendorRental } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { assertNonNegativeMinor } from "@/lib/money";
import {
  requireAuth,
  type SessionUser,
} from "@/lib/permissions";
import {
  initializePayment,
  verifyPayment,
} from "@/lib/payments/adapter";
import { siteUrl } from "@/lib/env";
import { requireOwnedVendor } from "@/services/vendors";

export async function listActivePlans() {
  return prisma.shopRentalPlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { monthlyPriceMinor: "asc" }],
  });
}

export async function getVendorRental(
  user: SessionUser | null | undefined,
  vendorId?: string,
) {
  const vendor = await requireOwnedVendor(user, vendorId);
  return prisma.vendorRental.findUnique({
    where: { vendorId: vendor.id },
    include: { plan: true },
  });
}

const initRentSchema = z.object({
  idempotencyKey: z.string().min(8).max(128).optional(),
  callbackUrl: z.string().url().optional(),
});

/**
 * Start monthly rent payment via provider. Never marks rent paid here.
 */
export async function initializeMonthlyRentPayment(
  user: SessionUser | null | undefined,
  raw: z.input<typeof initRentSchema> = {},
): Promise<
  | {
      ok: true;
      authorizationUrl: string;
      reference: string;
      payment: RentalPayment;
    }
  | { ok: false; reason: string }
> {
  const u = requireAuth(user);
  const input = initRentSchema.parse(raw);
  const vendor = await requireOwnedVendor(u);
  const rental = await prisma.vendorRental.findUnique({
    where: { vendorId: vendor.id },
    include: { plan: true },
  });
  if (!rental) return { ok: false, reason: "No rental subscription found" };

  const amountMinor = rental.plan.monthlyPriceMinor;
  assertNonNegativeMinor(amountMinor, "monthlyPriceMinor");
  if (amountMinor <= 0) {
    return { ok: false, reason: "Plan has invalid price" };
  }

  const periodStart = rental.currentPeriodEnd;
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const idempotencyKey = input.idempotencyKey ?? randomUUID();

  const existing = await prisma.rentalPayment.findUnique({
    where: { idempotencyKey },
  });
  if (existing?.status === "SUCCEEDED") {
    return { ok: false, reason: "Payment already completed for this key" };
  }

  const payment =
    existing ??
    (await prisma.rentalPayment.create({
      data: {
        rentalId: rental.id,
        userId: u.id,
        amountMinor,
        currency: rental.plan.currency,
        status: "PENDING",
        provider: "paystack",
        idempotencyKey,
        periodStart,
        periodEnd,
      },
    }));

  const email = vendor.contactEmail || u.email;
  const init = await initializePayment({
    amountMinor,
    currency: rental.plan.currency,
    email,
    reference: payment.idempotencyKey,
    callbackUrl:
      input.callbackUrl ?? siteUrl("/admin/vendors/settings"),
    metadata: {
      type: "rental",
      rentalId: rental.id,
      vendorId: vendor.id,
      paymentId: payment.id,
    },
  });

  if (!init.ok) {
    return { ok: false, reason: init.reason };
  }

  await prisma.rentalPayment.update({
    where: { id: payment.id },
    data: { providerRef: init.reference, provider: init.provider },
  });

  return {
    ok: true,
    authorizationUrl: init.authorizationUrl,
    reference: init.reference,
    payment: { ...payment, providerRef: init.reference },
  };
}

/**
 * Confirm rental payment only after provider verification succeeds.
 * Extends the current billing period on success.
 */
export async function confirmRentalPaymentFromProvider(opts: {
  providerRef: string;
}): Promise<{ ok: boolean; reason?: string; rental?: VendorRental }> {
  const verification = await verifyPayment(opts.providerRef);
  if (!verification.ok) {
    return { ok: false, reason: verification.reason };
  }
  if (verification.status !== "success") {
    return {
      ok: false,
      reason: `Provider status is ${verification.status}, not success`,
    };
  }

  const payment = await prisma.rentalPayment.findFirst({
    where: {
      OR: [
        { providerRef: opts.providerRef },
        { idempotencyKey: opts.providerRef },
      ],
    },
    include: { rental: true },
  });

  if (!payment) {
    return { ok: false, reason: "Rental payment not found" };
  }

  if (payment.amountMinor !== verification.amountMinor) {
    return { ok: false, reason: "Amount mismatch" };
  }
  if (
    payment.currency.toUpperCase() !== verification.currency.toUpperCase()
  ) {
    return { ok: false, reason: "Currency mismatch" };
  }

  if (payment.status === "SUCCEEDED") {
    return { ok: true, rental: payment.rental };
  }

  const rental = await prisma.$transaction(async (tx) => {
    await tx.rentalPayment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        providerRef: verification.reference,
        paidAt: new Date(),
      },
    });

    return tx.vendorRental.update({
      where: { id: payment.rentalId },
      data: {
        status: "ACTIVE",
        currentPeriodStart: payment.periodStart,
        currentPeriodEnd: payment.periodEnd,
        nextPaymentDue: payment.periodEnd,
      },
    });
  });

  await writeAuditLog({
    actorId: payment.userId,
    action: "rental.payment.succeeded",
    entityType: "VendorRental",
    entityId: rental.id,
    meta: { providerRef: verification.reference },
  });

  return { ok: true, rental };
}

/**
 * Publishing is allowed when rental is ACTIVE or TRIAL and period has not expired.
 */
export async function checkRentalAllowsPublishing(
  vendorId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const rental = await prisma.vendorRental.findUnique({
    where: { vendorId },
  });

  if (!rental) {
    return { allowed: false, reason: "No rental subscription" };
  }

  const now = new Date();
  if (rental.currentPeriodEnd < now) {
    return { allowed: false, reason: "Rental period expired" };
  }

  if (rental.status === "ACTIVE" || rental.status === "TRIAL") {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Rental status is ${rental.status}`,
  };
}
