import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { ProductStatus } from "@/lib/types";
import { prisma } from "@/lib/db";

const listPublishedSchema = z.object({
  q: z.string().trim().max(200).optional(),
  categorySlug: z.string().trim().max(120).optional(),
  vendorSlug: z.string().trim().max(120).optional(),
  minPriceMinor: z.number().int().nonnegative().optional(),
  maxPriceMinor: z.number().int().nonnegative().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(48).default(24),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "title"])
    .default("newest"),
});

export type ListPublishedProductsInput = z.input<typeof listPublishedSchema>;

const productPublicInclude = {
  images: { orderBy: { sortOrder: "asc" as const }, take: 4 },
  category: { select: { id: true, name: true, slug: true } },
  vendor: {
    select: {
      id: true,
      slug: true,
      storeName: true,
      status: true,
    },
  },
} satisfies Prisma.ProductInclude;

export type PublicProduct = Prisma.ProductGetPayload<{
  include: typeof productPublicInclude;
}>;

function availableQty(p: { inventoryQty: number; reservedQty: number }): number {
  return Math.max(0, p.inventoryQty - p.reservedQty);
}

export async function listPublishedProducts(
  raw: ListPublishedProductsInput = {},
): Promise<{
  items: PublicProduct[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}> {
  const input = listPublishedSchema.parse(raw);

  const where: Prisma.ProductWhereInput = {
    status: "PUBLISHED",
    vendor: { status: "ACTIVE" },
  };

  if (input.q) {
    where.OR = [
      { title: { contains: input.q } },
      { description: { contains: input.q } },
      { sku: { contains: input.q } },
    ];
  }

  if (input.categorySlug) {
    where.category = { slug: input.categorySlug, isActive: true };
  }

  if (input.vendorSlug) {
    where.vendor = { ...(where.vendor as object), slug: input.vendorSlug };
  }

  if (input.minPriceMinor != null || input.maxPriceMinor != null) {
    where.priceMinor = {};
    if (input.minPriceMinor != null) {
      where.priceMinor.gte = input.minPriceMinor;
    }
    if (input.maxPriceMinor != null) {
      where.priceMinor.lte = input.maxPriceMinor;
    }
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    input.sort === "price_asc"
      ? { priceMinor: "asc" }
      : input.sort === "price_desc"
        ? { priceMinor: "desc" }
        : input.sort === "title"
          ? { title: "asc" }
          : { publishedAt: "desc" };

  const skip = (input.page - 1) * input.pageSize;

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productPublicInclude,
      orderBy,
      skip,
      take: input.pageSize,
    }),
  ]);

  return {
    items,
    total,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function getProductBySlug(
  slug: string,
): Promise<PublicProduct | null> {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      vendor: { status: "ACTIVE" },
    },
    include: productPublicInclude,
  });
  return product;
}

export async function getRelatedProducts(
  productId: string,
  limit = 8,
): Promise<PublicProduct[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true, vendorId: true },
  });
  if (!product) return [];

  const where: Prisma.ProductWhereInput = {
    id: { not: productId },
    status: "PUBLISHED" satisfies ProductStatus,
    vendor: { status: "ACTIVE" },
    OR: [
      ...(product.categoryId
        ? [{ categoryId: product.categoryId }]
        : []),
      { vendorId: product.vendorId },
    ],
  };

  return prisma.product.findMany({
    where,
    include: productPublicInclude,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export { availableQty };
