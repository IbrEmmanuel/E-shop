import { prisma } from "@/lib/db";
import { requireAuth, type SessionUser } from "@/lib/permissions";

export async function listFavourites(userId: string) {
  return prisma.favourite.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          vendor: { select: { storeName: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function isFavourite(userId: string, productId: string) {
  const row = await prisma.favourite.findFirst({
    where: { userId, productId },
    select: { id: true },
  });
  return Boolean(row);
}

export async function toggleFavourite(
  user: SessionUser | null | undefined,
  productId: string,
): Promise<{ favourited: boolean }> {
  const u = requireAuth(user);
  const product = await prisma.product.findFirst({
    where: { id: productId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!product) throw new Error("Product not found");

  const existing = await prisma.favourite.findFirst({
    where: { userId: u.id, productId },
  });

  if (existing) {
    await prisma.favourite.delete({ where: { id: existing.id } });
    return { favourited: false };
  }

  await prisma.favourite.create({
    data: { userId: u.id, productId },
  });
  return { favourited: true };
}
