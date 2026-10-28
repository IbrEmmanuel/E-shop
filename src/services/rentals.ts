import { randomUUID } from "crypto";
import { z } from "zod";
import type { RentalPayment, VendorRental } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { assertNonNegativeMinor } from "@/lib/money";
import {
  requireAdmin,
  requireAuth,
  type SessionUser,
} from "@/lib/permissions";
import {
  initializePayment,
  verifyPayment,
} from "@/lib/payments/adapter";
import { siteUrl } from "@/lib/env";
import { requireOwnedVendor } from "@/services/vendors";

/** Public seller plans shown on /sell — keep in sync with prisma/seed.ts */
export const SELLER_PLAN_DEFS = [
  {
    slug: "starter",
    name: "Starter",
    description:
      "Launch your storefront with core catalog tools and monthly billing.",
    monthlyPriceMinor: 1_500_000,
    currency: "NGN",
    maxProducts: 50,
    trialDays: 14,
    featuresJson: JSON.stringify([
      "Branded storefront",
      "Product management",
      "CSV & XLSX bulk import",
      "Order desk",
    ]),
    sortOrder: 1,
  },
  {
    slug: "growth",
    name: "Growth",
    description:
      "Scale inventory, imports, and visibility for growing sellers.",
    monthlyPriceMinor: 3_500_000,
    currency: "NGN",
    maxProducts: 250,
    trialDays: 14,
    featuresJson: JSON.stringify([
      "Everything in Starter",
      "Up to 250 products",
      "Batch import dashboard",
      "Wallet & payouts ledger",
    ]),
    sortOrder: 2,
  },
  {
    slug: "pro",
    name: "Pro",
    description:
      "Maximum catalog capacity with featured placement eligibility.",
    monthlyPriceMinor: 7_500_000,
    currency: "NGN",
    maxProducts: 1000,
    trialDays: 7,
    featuresJson: JSON.stringify([
      "Everything in Growth",
      "Up to 1,000 products",
      "Sponsored placement eligibility",
      "Priority support",
    ]),
    sortOrder: 3,
  },
] as const;

/** Internal plan for the platform shop — never listed on /sell. */
export const PLATFORM_PLAN_DEF = {
  slug: "platform",
  name: "Platform",
  description: "Internal unlimited catalog for the official marketplace shop.",
  monthlyPriceMinor: 0,
  currency: "NGN",
  maxProducts: 1_000_000,
  trialDays: 3650,
  featuresJson: JSON.stringify(["Platform shop"]),
  sortOrder: 99,
  isActive: false,
} as const;

let plansEnsured = false;

/** Upsert canonical seller + platform plans so marketing caps stay correct. */
export async function ensureCanonicalPlans() {
  if (plansEnsured) return;
  for (const def of SELLER_PLAN_DEFS) {
    await prisma.shopRentalPlan.upsert({
      where: { slug: def.slug },
      create: { ...def, isActive: true },
      update: {
        name: def.name,
        description: def.description,
        monthlyPriceMinor: def.monthlyPriceMinor,
        currency: def.currency,
        maxProducts: def.maxProducts,
        trialDays: def.trialDays,
        featuresJson: def.featuresJson,
        sortOrder: def.sortOrder,
        isActive: true,
      },
    });
  }
  await prisma.shopRentalPlan.upsert({
    where: { slug: PLATFORM_PLAN_DEF.slug },
    create: { ...PLATFORM_PLAN_DEF },
    update: {
      name: PLATFORM_PLAN_DEF.name,
      description: PLATFORM_PLAN_DEF.description,
      maxProducts: PLATFORM_PLAN_DEF.maxProducts,
      trialDays: PLATFORM_PLAN_DEF.trialDays,
      featuresJson: PLATFORM_PLAN_DEF.featuresJson,
      sortOrder: PLATFORM_PLAN_DEF.sortOrder,
      isActive: false,
    },
  });
  plansEnsured = true;
}

export async function listActivePlans() {
  await ensureCanonicalPlans();
  return prisma.shopRentalPlan.findMany({
    where: { isActive: true, slug: { not: PLATFORM_PLAN_DEF.slug } },
    orderBy: [{ sortOrder: "asc" }, { monthlyPriceMinor: "asc" }],
  });
}

export async function getOrCreatePlatformPlan() {
  await ensureCanonicalPlans();
  const plan = await prisma.shopRentalPlan.findUnique({
    where: { slug: PLATFORM_PLAN_DEF.slug },
  });
  if (!plan) throw new Error("Platform plan missing");
  return plan;
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

/**
 * Enforce plan product caps on create / import.
 */
export async function checkVendorProductQuota(
  vendorId: string,
  additional = 1,
): Promise<{
  allowed: boolean;
  reason?: string;
  used: number;
  max: number;
  remaining: number;
}> {
  const rental = await prisma.vendorRental.findUnique({
    where: { vendorId },
    include: { plan: true },
  });
  if (!rental) {
    return {
      allowed: false,
      reason: "No rental subscription",
      used: 0,
      max: 0,
      remaining: 0,
    };
  }

  const used = await prisma.product.count({ where: { vendorId } });
  const max = rental.plan.maxProducts;
  const remaining = Math.max(0, max - used);
  if (used + additional > max) {
    return {
      allowed: false,
      reason: `Your ${rental.plan.name} plan allows up to ${max.toLocaleString("en-NG")} products (${used.toLocaleString("en-NG")} in use). Upgrade or archive products to add more.`,
      used,
      max,
      remaining,
    };
  }
  return { allowed: true, used, max, remaining };
}

/**
 * Record a bank-transfer rent invoice (PENDING) with a narration reference.
 */
export async function createBankRentInvoice(
  user: SessionUser | null | undefined,
  vendorId?: string,
): Promise<
  | {
      ok: true;
      payment: RentalPayment;
      reference: string;
      amountMinor: number;
      currency: string;
    }
  | { ok: false; reason: string }
> {
  const u = requireAuth(user);
  const vendor = await requireOwnedVendor(u, vendorId);
  const rental = await prisma.vendorRental.findUnique({
    where: { vendorId: vendor.id },
    include: { plan: true },
  });
  if (!rental) return { ok: false, reason: "No rental subscription found" };

  const amountMinor = rental.plan.monthlyPriceMinor;
  assertNonNegativeMinor(amountMinor, "monthlyPriceMinor");
  if (amountMinor <= 0) {
    return { ok: false, reason: "This plan has no monthly rent to collect" };
  }

  const open = await prisma.rentalPayment.findFirst({
    where: { rentalId: rental.id, status: "PENDING", provider: "bank_transfer" },
    orderBy: { createdAt: "desc" },
  });
  if (open) {
    return {
      ok: true,
      payment: open,
      reference: open.idempotencyKey,
      amountMinor: open.amountMinor,
      currency: open.currency,
    };
  }

  const periodStart =
    rental.currentPeriodEnd > new Date()
      ? rental.currentPeriodEnd
      : new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const reference = `RENT-${vendor.slug.slice(0, 12).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const payment = await prisma.rentalPayment.create({
    data: {
      rentalId: rental.id,
      userId: u.id,
      amountMinor,
      currency: rental.plan.currency,
      status: "PENDING",
      provider: "bank_transfer",
      idempotencyKey: reference,
      providerRef: reference,
      periodStart,
      periodEnd,
    },
  });

  await writeAuditLog({
    actorId: u.id,
    action: "rental.payment.invoice_created",
    entityType: "RentalPayment",
    entityId: payment.id,
    meta: { reference, vendorId: vendor.id },
  });

  return {
    ok: true,
    payment,
    reference,
    amountMinor,
    currency: rental.plan.currency,
  };
}

/**
 * Admin marks a bank rent transfer as paid and extends the rental period.
 */
export async function adminConfirmBankRentPayment(
  user: SessionUser | null | undefined,
  paymentId: string,
): Promise<{ ok: true; rental: VendorRental } | { ok: false; reason: string }> {
  const admin = requireAdmin(user);
  const payment = await prisma.rentalPayment.findUnique({
    where: { id: paymentId },
    include: { rental: true },
  });
  if (!payment) return { ok: false, reason: "Payment not found" };
  if (payment.status === "SUCCEEDED") {
    return { ok: true, rental: payment.rental };
  }
  if (payment.status !== "PENDING") {
    return { ok: false, reason: `Payment status is ${payment.status}` };
  }

  const rental = await prisma.$transaction(async (tx) => {
    await tx.rentalPayment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        paidAt: new Date(),
        provider: payment.provider || "bank_transfer",
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
    actorId: admin.id,
    action: "rental.payment.bank_confirmed",
    entityType: "VendorRental",
    entityId: rental.id,
    meta: { paymentId: payment.id, reference: payment.idempotencyKey },
  });

  return { ok: true, rental };
}
