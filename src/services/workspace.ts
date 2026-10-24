import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requireAuth, type SessionUser } from "@/lib/permissions";
import { ensureReferralCode } from "@/lib/greeting";

export async function ensureUserWorkspace(user: SessionUser) {
  const u = requireAuth(user);
  const existing = await prisma.user.findUnique({ where: { id: u.id } });
  if (!existing) throw new Error("User not found");

  let referralCode = existing.referralCode;
  if (!referralCode) {
    referralCode = ensureReferralCode(u.id);
    // avoid rare collisions
    const clash = await prisma.user.findUnique({ where: { referralCode } });
    if (clash) {
      referralCode = `ESHOP-${randomBytes(3).toString("hex").toUpperCase()}`;
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { referralCode },
    });
  }

  // Split name into first/last if missing
  if ((!existing.firstName || !existing.lastName) && existing.name) {
    const parts = existing.name.trim().split(/\s+/);
    await prisma.user.update({
      where: { id: u.id },
      data: {
        firstName: existing.firstName || parts[0] || null,
        lastName:
          existing.lastName || (parts.slice(1).join(" ") || null),
      },
    });
  }

  return prisma.user.findUniqueOrThrow({
    where: { id: u.id },
    include: {
      customerProfile: true,
      addresses: { orderBy: { createdAt: "desc" } },
      favourites: {
        include: {
          product: {
            include: {
              images: { take: 1, orderBy: { sortOrder: "asc" } },
              vendor: { select: { storeName: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      referrals: {
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      vendor: {
        include: {
          rental: { include: { plan: true } },
          wallet: true,
          _count: { select: { products: true, vendorOrders: true } },
        },
      },
    },
  });
}

export async function getPersonalOrderStats(userId: string) {
  const paidStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
  const pendingStatuses = ["PENDING_PAYMENT", "PROCESSING", "PAID"] as const;

  const [totalOrders, pendingOrders, spent, recent] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.count({
      where: { userId, status: { in: [...pendingStatuses] } },
    }),
    prisma.order.aggregate({
      where: { userId, status: { in: [...paidStatuses] } },
      _sum: { totalMinor: true },
    }),
    prisma.order.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        totalMinor: true,
        currency: true,
        orderNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    totalOrders,
    pendingOrders,
    totalSpentMinor: spent._sum.totalMinor ?? 0,
    recent,
    currency: recent[0]?.currency || "NGN",
  };
}

export async function getVendorWorkspaceStats(vendorId: string) {
  const [activeProducts, vendorOrders, wallet] = await Promise.all([
    prisma.product.count({
      where: { vendorId, status: "PUBLISHED" },
    }),
    prisma.vendorOrder.findMany({
      where: { vendorId },
      select: { totalMinor: true, status: true },
    }),
    prisma.vendorWallet.findUnique({ where: { vendorId } }),
  ]);

  const gross = vendorOrders
    .filter((o) =>
      ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status),
    )
    .reduce((s, o) => s + o.totalMinor, 0);

  return {
    activeProducts,
    totalOrders: vendorOrders.length,
    grossSalesMinor: gross,
    walletBalanceMinor: wallet?.balanceMinor ?? 0,
    currency: wallet?.currency || "NGN",
  };
}

export async function ensureVendorWallet(vendorId: string) {
  return prisma.vendorWallet.upsert({
    where: { vendorId },
    create: { vendorId, balanceMinor: 0, currency: "NGN" },
    update: {},
  });
}
