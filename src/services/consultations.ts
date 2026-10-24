import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import {
  requireAdmin,
  requireAuth,
  type SessionUser,
} from "@/lib/permissions";
import { initializePayment } from "@/lib/payments/adapter";
import { siteUrl } from "@/lib/env";
import { CONSULTATION_PACKAGES } from "@/lib/consultation-packages";

export { CONSULTATION_PACKAGES } from "@/lib/consultation-packages";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  phone: z.string().trim().max(40).optional().nullable(),
  topic: z.string().trim().min(2).max(160),
  message: z.string().trim().min(10).max(4000),
  packageId: z.string().optional(),
  preferredAt: z.coerce.date().optional().nullable(),
  userId: z.string().optional().nullable(),
});

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  scheduledAt: z.coerce.date().optional().nullable(),
  adminNotes: z.string().trim().max(4000).optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

function packageById(id?: string) {
  return (
    CONSULTATION_PACKAGES.find((p) => p.id === id) || CONSULTATION_PACKAGES[0]
  );
}

export async function createConsultation(
  raw: z.input<typeof createSchema>,
) {
  const input = createSchema.parse(raw);
  const pkg = packageById(input.packageId);
  const reference = `CON-${randomUUID().slice(0, 8).toUpperCase()}`;
  return prisma.consultation.create({
    data: {
      reference,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone ?? null,
      topic: input.topic,
      message: input.message,
      packageName: pkg.name,
      priceMinor: pkg.priceMinor,
      currency: "NGN",
      paymentStatus: pkg.priceMinor > 0 ? "UNPAID" : "PAID",
      preferredAt: input.preferredAt ?? null,
      userId: input.userId ?? null,
      status: "PENDING",
    },
  });
}

export async function listMyConsultations(user: SessionUser | null | undefined) {
  const u = requireAuth(user);
  return prisma.consultation.findMany({
    where: {
      OR: [{ userId: u.id }, { email: u.email.toLowerCase() }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listConsultations(
  user: SessionUser | null | undefined,
  opts?: { status?: string; take?: number },
) {
  requireAdmin(user);
  return prisma.consultation.findMany({
    where: opts?.status ? { status: opts.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: opts?.take ?? 100,
    include: {
      user: { select: { id: true, email: true, name: true } },
      assignee: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function updateConsultation(
  user: SessionUser | null | undefined,
  id: string,
  raw: z.input<typeof updateSchema>,
) {
  const admin = requireAdmin(user);
  const input = updateSchema.parse(raw);
  const existing = await prisma.consultation.findUnique({ where: { id } });
  if (!existing) throw new Error("Consultation not found");

  const updated = await prisma.consultation.update({
    where: { id },
    data: {
      status: input.status ?? existing.status,
      scheduledAt:
        input.scheduledAt === undefined
          ? existing.scheduledAt
          : input.scheduledAt,
      adminNotes:
        input.adminNotes === undefined ? existing.adminNotes : input.adminNotes,
      assigneeId:
        input.assigneeId === undefined
          ? existing.assigneeId
          : input.assigneeId || admin.id,
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "consultation.updated",
    entityType: "Consultation",
    entityId: id,
    meta: { status: updated.status },
  });

  return updated;
}

export async function consultationStats(user: SessionUser | null | undefined) {
  requireAdmin(user);
  const [pending, confirmed, completed, cancelled, total] = await Promise.all([
    prisma.consultation.count({ where: { status: "PENDING" } }),
    prisma.consultation.count({ where: { status: "CONFIRMED" } }),
    prisma.consultation.count({ where: { status: "COMPLETED" } }),
    prisma.consultation.count({ where: { status: "CANCELLED" } }),
    prisma.consultation.count(),
  ]);
  return { pending, confirmed, completed, cancelled, total };
}

/**
 * Start Paystack checkout for an unpaid consultation owned by the user.
 * Never marks paid without provider verification.
 */
export async function startConsultationPayment(
  user: SessionUser | null | undefined,
  consultationId: string,
) {
  const u = requireAuth(user);
  const c = await prisma.consultation.findUnique({
    where: { id: consultationId },
  });
  if (!c) throw new Error("Consultation not found");
  if (c.userId && c.userId !== u.id && u.role !== "ADMIN") {
    throw new Error("Not allowed");
  }
  if (c.email.toLowerCase() !== u.email.toLowerCase() && u.role !== "ADMIN") {
    if (c.userId !== u.id) throw new Error("Not allowed");
  }
  if (c.paymentStatus === "PAID") {
    return { ok: false as const, reason: "Already paid" };
  }
  if (c.priceMinor <= 0) {
    return { ok: false as const, reason: "No payment required" };
  }

  const reference = c.paymentRef || `CONS-${c.reference}-${randomUUID().slice(0, 6)}`;
  await prisma.consultation.update({
    where: { id: c.id },
    data: { paymentRef: reference, paymentStatus: "PENDING" },
  });

  const init = await initializePayment({
    amountMinor: c.priceMinor,
    currency: c.currency,
    email: c.email,
    reference,
    callbackUrl: siteUrl(`/admin/consultations?paid=${c.id}`),
    metadata: { consultationId: c.id, type: "consultation" },
  });

  if (!init.ok) {
    return { ok: false as const, reason: init.reason };
  }

  return {
    ok: true as const,
    authorizationUrl: init.authorizationUrl,
    reference: init.reference,
  };
}
