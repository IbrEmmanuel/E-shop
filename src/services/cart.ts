import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertNonNegativeMinor } from "@/lib/money";

/**
 * Guest cart cookie name: `eshop_guest`
 * Actual cookie read/write lives in server actions / route handlers.
 * Pass the cookie value here as `guestKey`.
 */

const cartItemInclude = {
  product: {
    include: {
      images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
      vendor: { select: { id: true, slug: true, storeName: true, status: true } },
    },
  },
  variant: true,
} satisfies Prisma.CartItemInclude;

export type CartWithItems = Prisma.CartGetPayload<{
  include: { items: { include: typeof cartItemInclude } };
}>;

const addSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional().nullable(),
  quantity: z.number().int().min(1).max(99).default(1),
});

const updateQtySchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(0).max(99),
});

function availableStock(p: {
  inventoryQty: number;
  reservedQty: number;
}): number {
  return Math.max(0, p.inventoryQty - p.reservedQty);
}

export async function getOrCreateCart(opts: {
  userId?: string | null;
  guestKey?: string | null;
}): Promise<CartWithItems> {
  const userId = opts.userId ?? null;
  const guestKey = opts.guestKey ?? null;

  if (!userId && !guestKey) {
    throw new Error("Either userId or guestKey is required for a cart");
  }

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      // Stale session after DB wipe — fall back to guest cart when possible
      if (guestKey) {
        return getOrCreateCart({ guestKey });
      }
      throw new Error("Please sign in again to continue shopping");
    }

    const existing = await prisma.cart.findFirst({
      where: { userId },
      include: { items: { include: cartItemInclude } },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) return existing;

    return prisma.cart.create({
      data: { userId },
      include: { items: { include: cartItemInclude } },
    });
  }

  const existing = await prisma.cart.findUnique({
    where: { guestKey: guestKey! },
    include: { items: { include: cartItemInclude } },
  });
  if (existing) return existing;

  return prisma.cart.create({
    data: { guestKey: guestKey! },
    include: { items: { include: cartItemInclude } },
  });
}

/**
 * Merge guest cart into the authenticated user's cart, then delete the guest cart.
 */
export async function mergeGuestCart(
  userId: string,
  guestKey: string,
): Promise<CartWithItems> {
  const userCart = await getOrCreateCart({ userId });
  const guestCart = await prisma.cart.findUnique({
    where: { guestKey },
    include: { items: true },
  });

  if (!guestCart || guestCart.items.length === 0) {
    return getOrCreateCart({ userId });
  }

  await prisma.$transaction(async (tx) => {
    for (const item of guestCart.items) {
      const existing = await tx.cartItem.findFirst({
        where: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
        },
      });
      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          },
        });
      }
    }
    await tx.cartItem.deleteMany({ where: { cartId: guestCart.id } });
    await tx.cart.delete({ where: { id: guestCart.id } });
  });

  return getOrCreateCart({ userId });
}

export async function addToCart(opts: {
  userId?: string | null;
  guestKey?: string | null;
  productId: string;
  variantId?: string | null;
  quantity?: number;
}): Promise<CartWithItems> {
  const parsed = addSchema.parse({
    productId: opts.productId,
    variantId: opts.variantId,
    quantity: opts.quantity ?? 1,
  });

  const product = await prisma.product.findFirst({
    where: {
      id: parsed.productId,
      status: "PUBLISHED",
      vendor: { status: "ACTIVE" },
    },
  });
  if (!product) throw new Error("Product not available");

  let unitAvailable = availableStock(product);
  if (parsed.variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: parsed.variantId, productId: product.id },
    });
    if (!variant) throw new Error("Variant not found");
    unitAvailable = availableStock(variant);
  }

  if (unitAvailable < 1) throw new Error("Out of stock");

  const cart = await getOrCreateCart({
    userId: opts.userId,
    guestKey: opts.guestKey,
  });

  const existing = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: parsed.productId,
      variantId: parsed.variantId ?? null,
    },
  });

  const nextQty = (existing?.quantity ?? 0) + parsed.quantity;
  if (nextQty > unitAvailable) {
    throw new Error(`Only ${unitAvailable} available`);
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQty },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: parsed.productId,
        variantId: parsed.variantId ?? null,
        quantity: parsed.quantity,
      },
    });
  }

  return getOrCreateCart({
    userId: opts.userId ?? cart.userId,
    guestKey: opts.guestKey ?? cart.guestKey,
  });
}

export async function updateCartItemQty(opts: {
  userId?: string | null;
  guestKey?: string | null;
  itemId: string;
  quantity: number;
}): Promise<CartWithItems> {
  const parsed = updateQtySchema.parse(opts);
  const cart = await getOrCreateCart({
    userId: opts.userId,
    guestKey: opts.guestKey,
  });

  const item = await prisma.cartItem.findFirst({
    where: { id: parsed.itemId, cartId: cart.id },
    include: { product: true, variant: true },
  });
  if (!item) throw new Error("Cart item not found");

  if (parsed.quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    const stock = item.variant
      ? availableStock(item.variant)
      : availableStock(item.product);
    if (parsed.quantity > stock) {
      throw new Error(`Only ${stock} available`);
    }
    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: parsed.quantity },
    });
  }

  return getOrCreateCart({
    userId: opts.userId ?? cart.userId,
    guestKey: opts.guestKey ?? cart.guestKey,
  });
}

export async function removeCartItem(opts: {
  userId?: string | null;
  guestKey?: string | null;
  itemId: string;
}): Promise<CartWithItems> {
  return updateCartItemQty({
    userId: opts.userId,
    guestKey: opts.guestKey,
    itemId: opts.itemId,
    quantity: 0,
  });
}

export type CartLineTotal = {
  itemId: string;
  productId: string;
  variantId: string | null;
  title: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  currency: string;
  available: number;
  inStock: boolean;
};

export type CartTotals = {
  currency: string;
  subtotalMinor: number;
  itemCount: number;
  lines: CartLineTotal[];
  allInStock: boolean;
};

/**
 * Server-side totals — always recalculated from DB prices/stock.
 * Never trust client-sent prices.
 */
export async function getCartTotals(opts: {
  userId?: string | null;
  guestKey?: string | null;
  cartId?: string;
}): Promise<CartTotals> {
  const cart = opts.cartId
    ? await prisma.cart.findUnique({
        where: { id: opts.cartId },
        include: { items: { include: cartItemInclude } },
      })
    : await getOrCreateCart({
        userId: opts.userId,
        guestKey: opts.guestKey,
      });

  if (!cart) {
    return {
      currency: "NGN",
      subtotalMinor: 0,
      itemCount: 0,
      lines: [],
      allInStock: true,
    };
  }

  const lines: CartLineTotal[] = [];
  let subtotalMinor = 0;
  let itemCount = 0;
  let allInStock = true;

  for (const item of cart.items) {
    const product = item.product;
    const unitPriceMinor =
      item.variant?.priceMinor != null
        ? item.variant.priceMinor
        : product.priceMinor;
    assertNonNegativeMinor(unitPriceMinor, "unitPriceMinor");

    const available = item.variant
      ? availableStock(item.variant)
      : availableStock(product);
    const inStock =
      product.status === "PUBLISHED" &&
      product.vendor.status === "ACTIVE" &&
      available >= item.quantity;

    if (!inStock) allInStock = false;

    const lineTotalMinor = unitPriceMinor * item.quantity;
    subtotalMinor += lineTotalMinor;
    itemCount += item.quantity;

    lines.push({
      itemId: item.id,
      productId: product.id,
      variantId: item.variantId,
      title: product.title,
      quantity: item.quantity,
      unitPriceMinor,
      lineTotalMinor,
      currency: product.currency,
      available,
      inStock,
    });
  }

  return {
    currency: cart.currency,
    subtotalMinor,
    itemCount,
    lines,
    allInStock,
  };
}

/** Alias matching the requested API name. */
export const updateQty = updateCartItemQty;
export const removeItem = removeCartItem;
