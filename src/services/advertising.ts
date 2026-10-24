import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import {
  PermissionError,
  requireAdmin,
  requireAuth,
  type SessionUser,
} from "@/lib/permissions";

const campaignCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  objective: z.enum(["AWARENESS", "TRAFFIC", "CONVERSIONS"]).default("AWARENESS"),
  budgetMinor: z.number().int().nonnegative().default(0),
  currency: z.string().trim().length(3).default("NGN"),
  vendorId: z.string().cuid().optional().nullable(),
  startAt: z.coerce.date().optional().nullable(),
  endAt: z.coerce.date().optional().nullable(),
});

const creativeSchema = z.object({
  type: z.enum(["SPONSORED_PRODUCT", "BANNER"]).default("SPONSORED_PRODUCT"),
  productId: z.string().cuid().optional().nullable(),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().max(2000).optional().nullable(),
  linkUrl: z.string().trim().max(2000).optional().nullable(),
});

export type CampaignMetrics = {
  impressions: number;
  clicks: number;
  conversions: number;
  revenueMinor: number;
  spendMinor: number;
  ctr: number;
  cpc: number | null;
  cpa: number | null;
  conversionRate: number;
  roas: number | null;
};

function computeMetrics(input: {
  impressions: number;
  clicks: number;
  conversions: number;
  revenueMinor: number;
  spendMinor: number;
}): CampaignMetrics {
  const { impressions, clicks, conversions, revenueMinor, spendMinor } = input;
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const conversionRate = clicks > 0 ? conversions / clicks : 0;
  const cpc = clicks > 0 ? spendMinor / clicks : null;
  const cpa = conversions > 0 ? spendMinor / conversions : null;
  const roas = spendMinor > 0 ? revenueMinor / spendMinor : null;
  return {
    impressions,
    clicks,
    conversions,
    revenueMinor,
    spendMinor,
    ctr,
    cpc,
    cpa,
    conversionRate,
    roas,
  };
}

export async function listCampaigns(
  user: SessionUser | null | undefined,
  opts?: { status?: string },
) {
  requireAdmin(user);
  const where: Prisma.AdCampaignWhereInput = {};
  if (opts?.status) where.status = opts.status;
  return prisma.adCampaign.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      vendor: { select: { id: true, storeName: true, slug: true } },
      creatives: { take: 5, orderBy: { sortOrder: "asc" } },
      _count: { select: { events: true, creatives: true } },
    },
    take: 100,
  });
}

export async function getCampaign(
  user: SessionUser | null | undefined,
  id: string,
) {
  requireAdmin(user);
  const campaign = await prisma.adCampaign.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, storeName: true, slug: true } },
      creatives: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            select: { id: true, title: true, slug: true, sku: true },
          },
        },
      },
    },
  });
  if (!campaign) throw new Error("Campaign not found");
  return campaign;
}

export async function createCampaign(
  user: SessionUser | null | undefined,
  raw: z.input<typeof campaignCreateSchema>,
) {
  const actor = requireAdmin(user);
  const input = campaignCreateSchema.parse(raw);
  if (input.endAt && input.startAt && input.endAt < input.startAt) {
    throw new Error("endAt must be after startAt");
  }

  const campaign = await prisma.adCampaign.create({
    data: {
      name: input.name,
      objective: input.objective,
      budgetMinor: input.budgetMinor,
      currency: input.currency,
      vendorId: input.vendorId || null,
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      createdById: actor.id,
      status: "DRAFT",
    },
  });

  await writeAuditLog({
    actorId: actor.id,
    action: "ad.campaign.created",
    entityType: "AdCampaign",
    entityId: campaign.id,
    meta: { name: campaign.name },
  });

  return campaign;
}

export async function updateCampaignStatus(
  user: SessionUser | null | undefined,
  id: string,
  status: string,
) {
  const actor = requireAdmin(user);
  const allowed = [
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "ACTIVE",
    "PAUSED",
    "ARCHIVED",
  ];
  if (!allowed.includes(status)) throw new Error("Invalid campaign status");

  const existing = await prisma.adCampaign.findUnique({ where: { id } });
  if (!existing) throw new Error("Campaign not found");

  const campaign = await prisma.adCampaign.update({
    where: { id },
    data: { status },
  });

  await writeAuditLog({
    actorId: actor.id,
    action: "ad.campaign.status",
    entityType: "AdCampaign",
    entityId: id,
    meta: { from: existing.status, to: status },
  });

  return campaign;
}

export async function addCreative(
  user: SessionUser | null | undefined,
  campaignId: string,
  raw: z.input<typeof creativeSchema>,
) {
  requireAdmin(user);
  const input = creativeSchema.parse(raw);
  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error("Campaign not found");

  if (input.type === "SPONSORED_PRODUCT" && !input.productId) {
    throw new Error("Sponsored product creatives require a productId");
  }

  if (input.productId) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });
    if (!product) throw new Error("Product not found");
    if (campaign.vendorId && product.vendorId !== campaign.vendorId) {
      throw new PermissionError("Product does not belong to campaign vendor");
    }
  }

  return prisma.adCreative.create({
    data: {
      campaignId,
      type: input.type,
      productId: input.productId || null,
      title: input.title,
      body: input.body || null,
      imageUrl: input.imageUrl || null,
      linkUrl: input.linkUrl || null,
      status: "ACTIVE",
    },
  });
}

export async function recordAdEvent(input: {
  campaignId: string;
  creativeId?: string | null;
  productId?: string | null;
  eventType: "IMPRESSION" | "CLICK" | "CONVERSION";
  userId?: string | null;
  guestKey?: string | null;
  revenueMinor?: number | null;
  orderId?: string | null;
  /** Optional CPC-style debit against campaign budget (minor units). */
  costMinor?: number;
}) {
  const campaign = await prisma.adCampaign.findUnique({
    where: { id: input.campaignId },
  });
  if (!campaign || campaign.status !== "ACTIVE") return null;

  const cost = Math.max(0, input.costMinor ?? 0);

  return prisma.$transaction(async (tx) => {
    const event = await tx.adEvent.create({
      data: {
        campaignId: input.campaignId,
        creativeId: input.creativeId || null,
        productId: input.productId || null,
        eventType: input.eventType,
        userId: input.userId || null,
        guestKey: input.guestKey || null,
        revenueMinor: input.revenueMinor ?? null,
        orderId: input.orderId || null,
      },
    });

    if (cost > 0) {
      await tx.adCampaign.update({
        where: { id: input.campaignId },
        data: { spentMinor: { increment: cost } },
      });
    }

    return event;
  });
}

export async function getCampaignMetrics(
  user: SessionUser | null | undefined,
  campaignId: string,
  range?: { from?: Date; to?: Date },
): Promise<CampaignMetrics> {
  requireAdmin(user);
  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error("Campaign not found");

  const createdAt: Prisma.DateTimeFilter = {};
  if (range?.from) createdAt.gte = range.from;
  if (range?.to) createdAt.lte = range.to;

  const where: Prisma.AdEventWhereInput = {
    campaignId,
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  };

  const [impressions, clicks, conversions, revenueAgg] = await Promise.all([
    prisma.adEvent.count({ where: { ...where, eventType: "IMPRESSION" } }),
    prisma.adEvent.count({ where: { ...where, eventType: "CLICK" } }),
    prisma.adEvent.count({ where: { ...where, eventType: "CONVERSION" } }),
    prisma.adEvent.aggregate({
      where: { ...where, eventType: "CONVERSION" },
      _sum: { revenueMinor: true },
    }),
  ]);

  return computeMetrics({
    impressions,
    clicks,
    conversions,
    revenueMinor: revenueAgg._sum.revenueMinor ?? 0,
    spendMinor: campaign.spentMinor,
  });
}

export async function getActiveSponsoredPlacements(limit = 8) {
  const now = new Date();
  const creatives = await prisma.adCreative.findMany({
    where: {
      status: "ACTIVE",
      type: "SPONSORED_PRODUCT",
      productId: { not: null },
      campaign: {
        status: "ACTIVE",
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
      },
      product: {
        status: "PUBLISHED",
        vendor: { status: "ACTIVE" },
      },
    },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          vendor: { select: { storeName: true, slug: true } },
        },
      },
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { sortOrder: "asc" },
    take: limit,
  });
  return creatives;
}

export async function getAudienceSegments(user: SessionUser | null | undefined) {
  requireAdmin(user);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [categoryViews, cartAdds, purchases, optedIn] = await Promise.all([
    prisma.productViewEvent.groupBy({
      by: ["categoryId"],
      where: {
        createdAt: { gte: since },
        categoryId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { categoryId: "desc" } },
      take: 10,
    }),
    prisma.cartItem.count({
      where: { createdAt: { gte: since } },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: since },
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
    }),
    prisma.audienceConsent.count({ where: { marketingOptIn: true } }),
  ]);

  return {
    windowDays: 30,
    topCategories: categoryViews
      .filter((r) => r.categoryId)
      .map((r) => ({
        categoryId: r.categoryId as string,
        views: r._count._all,
      })),
    cartAdditions: cartAdds,
    purchases,
    marketingOptIns: optedIn,
  };
}

export async function upsertAudienceConsent(
  user: SessionUser | null | undefined,
  input: { analyticsOptIn: boolean; marketingOptIn: boolean },
) {
  const u = requireAuth(user);
  return prisma.audienceConsent.upsert({
    where: { userId: u.id },
    create: {
      userId: u.id,
      analyticsOptIn: input.analyticsOptIn,
      marketingOptIn: input.marketingOptIn,
    },
    update: {
      analyticsOptIn: input.analyticsOptIn,
      marketingOptIn: input.marketingOptIn,
    },
  });
}

export async function recordProductView(input: {
  productId: string;
  categoryId?: string | null;
  userId?: string | null;
  guestKey?: string | null;
}) {
  if (input.userId) {
    const consent = await prisma.audienceConsent.findUnique({
      where: { userId: input.userId },
    });
    if (consent && !consent.analyticsOptIn) return null;
  }

  return prisma.productViewEvent.create({
    data: {
      productId: input.productId,
      categoryId: input.categoryId || null,
      userId: input.userId || null,
      guestKey: input.guestKey || null,
    },
  });
}
