import { prisma } from "@/lib/db";
import { requireAuth, type SessionUser } from "@/lib/permissions";

export async function listProductReviews(productId: string) {
  return prisma.productReview.findMany({
    where: { productId, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      user: { select: { name: true, firstName: true } },
    },
  });
}

export async function getProductRatingSummary(productId: string) {
  const agg = await prisma.productReview.aggregate({
    where: { productId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return {
    average: agg._avg.rating ?? 0,
    count: agg._count._all,
  };
}

export async function canReviewProduct(userId: string, productId: string) {
  const purchased = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId,
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
    },
  });
  if (!purchased) return false;
  const existing = await prisma.productReview.findUnique({
    where: { productId_userId: { productId, userId } },
  });
  return !existing;
}

export async function submitProductReview(
  user: SessionUser | null | undefined,
  input: {
    productId: string;
    rating: number;
    title?: string;
    body: string;
  },
) {
  const u = requireAuth(user);
  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }
  const body = input.body.trim();
  if (body.length < 8) throw new Error("Review must be at least 8 characters");

  const allowed = await canReviewProduct(u.id, input.productId);
  if (!allowed) {
    throw new Error("Buy this product before leaving a review, or you already reviewed it.");
  }

  return prisma.productReview.create({
    data: {
      productId: input.productId,
      userId: u.id,
      rating: input.rating,
      title: input.title?.trim() || null,
      body,
      status: "PUBLISHED",
    },
  });
}
