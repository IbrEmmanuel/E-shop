import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { requireAdmin, requireAuth, type SessionUser } from "@/lib/permissions";
import { ensureVendorWallet } from "@/services/workspace";

/**
 * Credit each vendor's wallet for a paid order (idempotent per vendorOrderId).
 * Net = vendorOrder.totalMinor - platform commission.
 */
export async function settleVendorEarnings(orderId: string): Promise<void> {
  const vendorOrders = await prisma.vendorOrder.findMany({
    where: { orderId },
    include: { vendor: { select: { id: true, commissionBps: true } } },
  });

  for (const vo of vendorOrders) {
    const referenceId = `sale:${vo.id}`;
    const existing = await prisma.walletLedger.findFirst({
      where: { referenceId },
    });
    if (existing) continue;

    const commissionBps = vo.vendor.commissionBps ?? 1000;
    const commissionMinor = Math.floor(
      (vo.totalMinor * commissionBps) / 10_000,
    );
    const netMinor = Math.max(0, vo.totalMinor - commissionMinor);
    if (netMinor <= 0) continue;

    const wallet = await ensureVendorWallet(vo.vendorId);

    await prisma.$transaction(async (tx) => {
      const again = await tx.walletLedger.findFirst({
        where: { referenceId },
      });
      if (again) return;

      const updated = await tx.vendorWallet.update({
        where: { id: wallet.id },
        data: { balanceMinor: { increment: netMinor } },
      });

      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          deltaMinor: netMinor,
          balanceAfter: updated.balanceMinor,
          reason: "sale_settlement",
          referenceId,
        },
      });
    });
  }
}

/**
 * Reverse a prior sale settlement (refund clawback). Idempotent.
 */
export async function clawbackVendorEarnings(orderId: string): Promise<void> {
  const vendorOrders = await prisma.vendorOrder.findMany({
    where: { orderId },
  });

  for (const vo of vendorOrders) {
    const saleRef = `sale:${vo.id}`;
    const refundRef = `refund:${vo.id}`;
    const sale = await prisma.walletLedger.findFirst({
      where: { referenceId: saleRef },
    });
    if (!sale) continue;

    const already = await prisma.walletLedger.findFirst({
      where: { referenceId: refundRef },
    });
    if (already) continue;

    const wallet = await ensureVendorWallet(vo.vendorId);
    const delta = -Math.abs(sale.deltaMinor);

    await prisma.$transaction(async (tx) => {
      const again = await tx.walletLedger.findFirst({
        where: { referenceId: refundRef },
      });
      if (again) return;

      const updated = await tx.vendorWallet.update({
        where: { id: wallet.id },
        data: { balanceMinor: { increment: delta } },
      });

      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          deltaMinor: delta,
          balanceAfter: updated.balanceMinor,
          reason: "refund_clawback",
          referenceId: refundRef,
        },
      });
    });
  }
}

export async function requestPayout(
  user: SessionUser | null | undefined,
  input: {
    amountMinor: number;
    bankName: string;
    accountName: string;
    accountNumber: string;
  },
) {
  const u = requireAuth(user);
  const vendor = await prisma.vendor.findUnique({ where: { userId: u.id } });
  if (!vendor || (u.role !== "VENDOR" && (u.role !== "ADMIN" && u.role !== "SUPER_ADMIN"))) {
    throw new Error("Vendor account required");
  }
  if ((u.role === "ADMIN" || u.role === "SUPER_ADMIN") && vendor.userId !== u.id) {
    // Admin may only request for their own shop if they have one
  }

  if (input.amountMinor < 100_00) {
    throw new Error("Minimum payout is ₦100.00");
  }

  const wallet = await ensureVendorWallet(vendor.id);
  if (wallet.balanceMinor < input.amountMinor) {
    throw new Error("Insufficient wallet balance");
  }

  const pending = await prisma.payoutRequest.findFirst({
    where: { vendorId: vendor.id, status: "PENDING" },
  });
  if (pending) {
    throw new Error("You already have a pending payout request");
  }

  return prisma.payoutRequest.create({
    data: {
      vendorId: vendor.id,
      amountMinor: input.amountMinor,
      currency: wallet.currency,
      bankName: input.bankName.trim(),
      accountName: input.accountName.trim(),
      accountNumber: input.accountNumber.trim(),
      status: "PENDING",
    },
  });
}

export async function reviewPayoutRequest(
  user: SessionUser | null | undefined,
  opts: {
    payoutId: string;
    decision: "APPROVED" | "REJECTED";
    adminNote?: string;
  },
) {
  const admin = requireAdmin(user);
  const payout = await prisma.payoutRequest.findUnique({
    where: { id: opts.payoutId },
  });
  if (!payout) throw new Error("Payout not found");
  if (payout.status !== "PENDING") throw new Error("Payout already reviewed");

  if (opts.decision === "REJECTED") {
    return prisma.payoutRequest.update({
      where: { id: payout.id },
      data: {
        status: "REJECTED",
        adminNote: opts.adminNote || null,
        reviewedAt: new Date(),
        reviewedById: admin.id,
      },
    });
  }

  const wallet = await ensureVendorWallet(payout.vendorId);
  if (wallet.balanceMinor < payout.amountMinor) {
    throw new Error("Vendor balance is lower than the requested amount");
  }

  const referenceId = `payout:${payout.id}`;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.vendorWallet.update({
      where: { id: wallet.id },
      data: { balanceMinor: { decrement: payout.amountMinor } },
    });

    await tx.walletLedger.create({
      data: {
        walletId: wallet.id,
        deltaMinor: -payout.amountMinor,
        balanceAfter: updated.balanceMinor,
        reason: "payout",
        referenceId,
      },
    });

    await tx.payoutRequest.update({
      where: { id: payout.id },
      data: {
        status: "APPROVED",
        adminNote: opts.adminNote || null,
        reviewedAt: new Date(),
        reviewedById: admin.id,
      },
    });
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "payout.approved",
    entityType: "PayoutRequest",
    entityId: payout.id,
    meta: { vendorId: payout.vendorId, amountMinor: payout.amountMinor },
  });

  return prisma.payoutRequest.findUniqueOrThrow({ where: { id: payout.id } });
}
