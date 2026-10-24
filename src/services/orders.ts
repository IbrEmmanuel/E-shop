import { randomBytes } from "crypto";
import { z } from "zod";
import type { Order } from "@prisma/client";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { assertNonNegativeMinor } from "@/lib/money";
import { requireAuth, type SessionUser } from "@/lib/permissions";
import { verifyPayment } from "@/lib/payments/adapter";
import { getCartTotals } from "@/services/cart";
import {
  estimateDeliveryDate,
  quoteDelivery,
} from "@/lib/shipping";

const shippingSchema = z.object({
  shippingName: z.string().trim().min(1).max(200),
  shippingLine1: z.string().trim().min(1).max(300),
  shippingLine2: z.string().trim().max(300).optional().nullable(),
  shippingCity: z.string().trim().min(1).max(120),
  shippingState: z.string().trim().max(120).optional().nullable(),
  shippingPostal: z.string().trim().max(40).optional().nullable(),
  shippingCountry: z.string().trim().min(2).max(2).default("NG"),
  shippingPhone: z.string().trim().max(40).optional().nullable(),
  guestEmail: z.string().email().optional().nullable(),
});

const createOrderSchema = shippingSchema.extend({
  idempotencyKey: z.string().min(8).max(128),
  cartId: z.string().min(1).optional(),
  userId: z.string().min(1).optional().nullable(),
  guestKey: z.string().min(1).optional().nullable(),
});

export type CreateOrderFromCartInput = z.input<typeof createOrderSchema>;

function orderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = randomBytes(3).toString("hex").toUpperCase();
  return `ES-${ts}-${rnd}`;
}

function availableStock(p: {
  inventoryQty: number;
  reservedQty: number;
}): number {
  return Math.max(0, p.inventoryQty - p.reservedQty);
}

/**
 * Create an order from the cart with multi-vendor VendorOrder split.
 * Reserves inventory inside a transaction. Idempotent on idempotencyKey.
 */
export async function createOrderFromCart(
  raw: CreateOrderFromCartInput,
): Promise<Order> {
  const input = createOrderSchema.parse(raw);

  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing;

  if (!input.userId && !input.guestEmail) {
    throw new Error("guestEmail is required for guest checkout");
  }

  const totals = await getCartTotals({
    userId: input.userId,
    guestKey: input.guestKey,
    cartId: input.cartId,
  });

  if (totals.lines.length === 0) throw new Error("Cart is empty");
  if (!totals.allInStock) {
    throw new Error("One or more items are out of stock or unavailable");
  }

  assertNonNegativeMinor(totals.subtotalMinor, "subtotalMinor");

  const cart = await prisma.cart.findFirst({
    where: input.cartId
      ? { id: input.cartId }
      : input.userId
        ? { userId: input.userId }
        : { guestKey: input.guestKey! },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

  const delivery = quoteDelivery({
    city: input.shippingCity,
    state: input.shippingState,
    country: input.shippingCountry,
  });
  if (delivery.shippingMinor <= 0) {
    throw new Error("Enter a valid delivery city and state to calculate shipping.");
  }
  const shippingMinor = delivery.shippingMinor;
  const discountMinor = 0;
  const totalMinor = totals.subtotalMinor + shippingMinor - discountMinor;
  assertNonNegativeMinor(totalMinor, "totalMinor");

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Re-check stock and reserve inside the transaction
      type LineSnap = {
        productId: string;
        vendorId: string;
        titleSnapshot: string;
        skuSnapshot: string;
        variantSnapshot: string | null;
        quantity: number;
        unitPriceMinor: number;
        lineTotalMinor: number;
        currency: string;
      };

      const lineSnaps: LineSnap[] = [];

      for (const item of cart.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product || product.status !== "PUBLISHED") {
          throw new Error(`Product unavailable: ${item.productId}`);
        }

        let unitPriceMinor = product.priceMinor;
        let skuSnapshot = product.sku;
        let variantSnapshot: string | null = null;
        let available = availableStock(product);

        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
          });
          if (!variant || variant.productId !== product.id) {
            throw new Error("Invalid variant");
          }
          if (variant.priceMinor != null) unitPriceMinor = variant.priceMinor;
          skuSnapshot = variant.sku;
          variantSnapshot = variant.name;
          available = availableStock(variant);
        }

        if (available < item.quantity) {
          throw new Error(`Insufficient stock for ${product.title}`);
        }

        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { reservedQty: { increment: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: product.id },
            data: { reservedQty: { increment: item.quantity } },
          });
        }

        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            delta: 0,
            reason: "RESERVE",
            referenceId: input.idempotencyKey,
          },
        });

        const lineTotalMinor = unitPriceMinor * item.quantity;
        lineSnaps.push({
          productId: product.id,
          vendorId: product.vendorId,
          titleSnapshot: product.title,
          skuSnapshot,
          variantSnapshot,
          quantity: item.quantity,
          unitPriceMinor,
          lineTotalMinor,
          currency: product.currency,
        });
      }

      const byVendor = new Map<string, LineSnap[]>();
      for (const line of lineSnaps) {
        const list = byVendor.get(line.vendorId) ?? [];
        list.push(line);
        byVendor.set(line.vendorId, list);
      }

      const created = await tx.order.create({
        data: {
          orderNumber: orderNumber(),
          userId: input.userId ?? null,
          guestEmail: input.guestEmail ?? null,
          status: "PENDING_PAYMENT",
          currency: totals.currency,
          subtotalMinor: totals.subtotalMinor,
          shippingMinor,
          discountMinor,
          totalMinor,
          idempotencyKey: input.idempotencyKey,
          shippingName: input.shippingName,
          shippingLine1: input.shippingLine1,
          shippingLine2: input.shippingLine2 ?? null,
          shippingCity: input.shippingCity,
          shippingState: input.shippingState ?? null,
          shippingPostal: input.shippingPostal ?? null,
          shippingCountry: input.shippingCountry,
          shippingPhone: input.shippingPhone ?? null,
          deliveryZone: delivery.zone,
          statusHistory: {
            create: {
              status: "PENDING_PAYMENT",
              note: `Order created; awaiting payment. Delivery ${delivery.label} ${shippingMinor / 100} NGN (ETA ${delivery.etaMinDays}–${delivery.etaMaxDays} days after payment).`,
            },
          },
        },
      });

      for (const [vendorId, lines] of byVendor) {
        const vendorSubtotal = lines.reduce((s, l) => s + l.lineTotalMinor, 0);
        const vendorOrder = await tx.vendorOrder.create({
          data: {
            orderId: created.id,
            vendorId,
            status: "PENDING_PAYMENT",
            subtotalMinor: vendorSubtotal,
            shippingMinor: 0,
            totalMinor: vendorSubtotal,
          },
        });

        for (const line of lines) {
          await tx.orderItem.create({
            data: {
              orderId: created.id,
              vendorOrderId: vendorOrder.id,
              productId: line.productId,
              vendorId: line.vendorId,
              titleSnapshot: line.titleSnapshot,
              skuSnapshot: line.skuSnapshot,
              variantSnapshot: line.variantSnapshot,
              quantity: line.quantity,
              unitPriceMinor: line.unitPriceMinor,
              discountMinor: 0,
              lineTotalMinor: line.lineTotalMinor,
              currency: line.currency,
            },
          });
        }
      }

      // Clear cart items after successful order creation
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    await writeAuditLog({
      actorId: input.userId ?? null,
      action: "order.created",
      entityType: "Order",
      entityId: order.id,
      meta: {
        orderNumber: order.orderNumber,
        totalMinor: order.totalMinor,
        idempotencyKey: input.idempotencyKey,
      },
    });

    return order;
  } catch (err) {
    // Unique constraint on idempotencyKey — concurrent create
    const again = await prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (again) return again;
    throw err;
  }
}

/**
 * Mark order paid only after payment provider verification succeeds.
 * Never call this with a fabricated success — verification is mandatory.
 */
export async function markOrderPaidFromProvider(opts: {
  providerRef: string;
  expectedOrderId?: string;
}): Promise<{
  ok: boolean;
  reason?: string;
  order?: Order;
}> {
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

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { providerRef: opts.providerRef },
        { idempotencyKey: opts.providerRef },
      ],
    },
    include: { order: true },
  });

  if (!payment) {
    return { ok: false, reason: "Payment record not found for reference" };
  }

  if (
    opts.expectedOrderId &&
    payment.orderId !== opts.expectedOrderId
  ) {
    return { ok: false, reason: "Order mismatch for payment reference" };
  }

  if (payment.amountMinor !== verification.amountMinor) {
    return {
      ok: false,
      reason: `Amount mismatch: expected ${payment.amountMinor}, got ${verification.amountMinor}`,
    };
  }

  if (
    payment.currency.toUpperCase() !== verification.currency.toUpperCase()
  ) {
    return { ok: false, reason: "Currency mismatch" };
  }

  if (payment.status === "SUCCEEDED" && payment.order.status === "PAID") {
    return { ok: true, order: payment.order };
  }

  const updated = await finalizeOrderPaid({
    paymentId: payment.id,
    orderId: payment.orderId,
    providerRef: verification.reference,
    rawMeta: verification.raw,
    note: `Payment verified via provider (${verification.reference})`,
  });

  await writeAuditLog({
    action: "order.paid",
    entityType: "Order",
    entityId: updated.id,
    meta: { providerRef: verification.reference },
  });

  return { ok: true, order: updated };
}

/**
 * Convert reserved stock into sold inventory and mark order + payment paid.
 */
async function finalizeOrderPaid(opts: {
  paymentId: string;
  orderId: string;
  providerRef?: string | null;
  rawMeta?: unknown;
  note: string;
}): Promise<Order> {
  return prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: opts.paymentId },
      data: {
        status: "SUCCEEDED" satisfies PaymentStatus,
        ...(opts.providerRef ? { providerRef: opts.providerRef } : {}),
        paidAt: new Date(),
        rawMetaJson: opts.rawMeta ? JSON.stringify(opts.rawMeta) : undefined,
      },
    });

    const existingOrder = await tx.order.findUniqueOrThrow({
      where: { id: opts.orderId },
    });
    const delivery = quoteDelivery({
      city: existingOrder.shippingCity,
      state: existingOrder.shippingState,
      country: existingOrder.shippingCountry,
    });
    const eta = estimateDeliveryDate(new Date(), delivery);

    const order = await tx.order.update({
      where: { id: opts.orderId },
      data: {
        status: "PAID" satisfies OrderStatus,
        deliveryZone: delivery.zone,
        etaEarliestAt: eta.earliest,
        etaLatestAt: eta.latest,
      },
    });

    await tx.vendorOrder.updateMany({
      where: { orderId: order.id },
      data: { status: "PAID" },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: "PAID",
        note: `${opts.note} Estimated delivery ${eta.earliest.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })} – ${eta.latest.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })} to ${order.shippingCity || "your address"}.`,
      },
    });

    const items = await tx.orderItem.findMany({
      where: { orderId: order.id },
    });

    for (const item of items) {
      if (!item.productId) continue;
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) continue;

      await tx.product.update({
        where: { id: product.id },
        data: {
          inventoryQty: { decrement: item.quantity },
          reservedQty: { decrement: item.quantity },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          delta: -item.quantity,
          reason: "SALE",
          referenceId: order.id,
        },
      });
    }

    return order;
  });
}

/**
 * Customer reports they transferred via OPay / Moniepoint / PalmPay / bank
 * and uploads payment proof for admin approval before fulfillment.
 */
export async function reportBankTransfer(opts: {
  orderNumber: string;
  transferRef: string;
  paidVia: string;
  accountId: string;
  proofUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await prisma.order.findUnique({
    where: { orderNumber: opts.orderNumber },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status === "PAID") return { ok: true };

  const payment = order.payments[0];
  if (!payment || payment.provider !== "bank_transfer") {
    return { ok: false, error: "This order is not awaiting a bank transfer." };
  }
  if (payment.status === "SUCCEEDED") return { ok: true };

  const transferRef = opts.transferRef.trim().slice(0, 120);
  if (transferRef.length < 3) {
    return { ok: false, error: "Enter your transfer reference or session ID." };
  }
  if (!opts.proofUrl?.trim()) {
    return {
      ok: false,
      error: "Upload a screenshot or photo of your transfer receipt.",
    };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "REQUIRES_ACTION" satisfies PaymentStatus,
      rawMetaJson: JSON.stringify({
        method: "bank_transfer",
        accountId: opts.accountId,
        paidVia: opts.paidVia.trim().slice(0, 80),
        transferRef,
        proofUrl: opts.proofUrl.trim(),
        reportedAt: new Date().toISOString(),
      }),
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: order.id,
      status: order.status,
      note: `Payment proof uploaded (${opts.paidVia}, ref ${transferRef}). Awaiting admin approval before delivery.`,
    },
  });

  await writeAuditLog({
    action: "payment.bank_transfer.reported",
    entityType: "Payment",
    entityId: payment.id,
    meta: {
      orderNumber: order.orderNumber,
      transferRef,
      proofUrl: opts.proofUrl,
    },
  });

  return { ok: true };
}

const FULFILLMENT_STATUSES: OrderStatus[] = [
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

/**
 * Admin advances fulfillment so customers can track delivery timing.
 */
export async function advanceOrderFulfillment(opts: {
  orderId: string;
  adminUserId: string;
  status: "PROCESSING" | "SHIPPED" | "DELIVERED";
  note?: string;
}): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  if (!FULFILLMENT_STATUSES.includes(opts.status)) {
    return { ok: false, error: "Invalid status" };
  }

  const order = await prisma.order.findUnique({ where: { id: opts.orderId } });
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status === "PENDING_PAYMENT") {
    return { ok: false, error: "Confirm payment before shipping." };
  }
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return { ok: false, error: "Order is closed." };
  }

  const now = new Date();
  const data: {
    status: OrderStatus;
    shippedAt?: Date;
    deliveredAt?: Date;
  } = { status: opts.status };
  if (opts.status === "SHIPPED") data.shippedAt = now;
  if (opts.status === "DELIVERED") data.deliveredAt = now;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.order.update({
      where: { id: order.id },
      data,
    });
    const vendorStatus =
      opts.status === "PROCESSING"
        ? "ACCEPTED"
        : opts.status === "SHIPPED"
          ? "SHIPPED"
          : "DELIVERED";
    await tx.vendorOrder.updateMany({
      where: { orderId: order.id },
      data: { status: vendorStatus },
    });
    const defaultNote =
      opts.status === "PROCESSING"
        ? "Order is being packed at the warehouse."
        : opts.status === "SHIPPED"
          ? `Out for delivery toward ${order.shippingCity || "your location"}${order.etaLatestAt ? ` · expected by ${order.etaLatestAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}` : ""}.`
          : `Delivered to ${order.shippingLine1 || "customer address"}.`;
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: opts.status,
        note: opts.note?.trim() || defaultNote,
      },
    });
    return next;
  });

  await writeAuditLog({
    actorId: opts.adminUserId,
    action: "order.fulfillment",
    entityType: "Order",
    entityId: updated.id,
    meta: { status: opts.status },
  });

  return { ok: true, order: updated };
}

export type TrackingStep = {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
  at?: Date | null;
  note?: string | null;
};

export function buildOrderTracking(order: {
  status: string;
  createdAt: Date;
  etaEarliestAt?: Date | null;
  etaLatestAt?: Date | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingLine1?: string | null;
  statusHistory: { status: string; note: string | null; createdAt: Date }[];
}): {
  steps: TrackingStep[];
  etaLabel: string | null;
  locationHint: string;
} {
  const hist = (s: string) =>
    order.statusHistory.find((h) => h.status === s) || null;
  const paid = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(
    order.status,
  );
  const processing = ["PROCESSING", "SHIPPED", "DELIVERED"].includes(
    order.status,
  );
  const shipped = ["SHIPPED", "DELIVERED"].includes(order.status);
  const delivered = order.status === "DELIVERED";

  const steps: TrackingStep[] = [
    {
      key: "placed",
      label: "Order placed",
      done: true,
      active: order.status === "PENDING_PAYMENT",
      at: order.createdAt,
      note: hist("PENDING_PAYMENT")?.note,
    },
    {
      key: "payment",
      label: paid ? "Payment approved" : "Awaiting payment approval",
      done: paid,
      active: order.status === "PENDING_PAYMENT",
      at: hist("PAID")?.createdAt ?? null,
      note: hist("PAID")?.note,
    },
    {
      key: "processing",
      label: "Packing / preparing",
      done: processing,
      active: order.status === "PROCESSING",
      at: hist("PROCESSING")?.createdAt ?? null,
      note: hist("PROCESSING")?.note,
    },
    {
      key: "shipped",
      label: "On the way to you",
      done: shipped,
      active: order.status === "SHIPPED",
      at: order.shippedAt ?? hist("SHIPPED")?.createdAt ?? null,
      note: hist("SHIPPED")?.note,
    },
    {
      key: "delivered",
      label: "Delivered",
      done: delivered,
      active: delivered,
      at: order.deliveredAt ?? hist("DELIVERED")?.createdAt ?? null,
      note: hist("DELIVERED")?.note,
    },
  ];

  let etaLabel: string | null = null;
  if (delivered) {
    etaLabel = "Delivered";
  } else if (order.etaEarliestAt && order.etaLatestAt) {
    etaLabel = `Expected ${order.etaEarliestAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })} – ${order.etaLatestAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}`;
  } else if (!paid) {
    etaLabel = "ETA starts after payment is approved";
  }

  const locationHint = [
    order.shippingLine1,
    order.shippingCity,
    order.shippingState,
  ]
    .filter(Boolean)
    .join(", ");

  return { steps, etaLabel, locationHint };
}

/**
 * Admin confirms a direct bank / fintech transfer landed.
 */
export async function confirmBankTransferPayment(opts: {
  orderId: string;
  adminUserId: string;
  note?: string;
}): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status === "PAID") return { ok: true, order };

  const payment = order.payments[0];
  if (!payment) return { ok: false, error: "No payment on this order" };

  let previousMeta: Record<string, unknown> = {};
  if (payment.rawMetaJson) {
    try {
      previousMeta = JSON.parse(payment.rawMetaJson) as Record<string, unknown>;
    } catch {
      previousMeta = {};
    }
  }

  const updated = await finalizeOrderPaid({
    paymentId: payment.id,
    orderId: order.id,
    providerRef: payment.providerRef || payment.idempotencyKey,
    rawMeta: {
      ...previousMeta,
      confirmedBy: opts.adminUserId,
      confirmedAt: new Date().toISOString(),
      adminNote: opts.note || null,
    },
    note:
      opts.note?.trim() ||
      "Bank / fintech transfer confirmed by admin (OPay, Moniepoint, PalmPay, UBA, etc.)",
  });

  await writeAuditLog({
    actorId: opts.adminUserId,
    action: "payment.bank_transfer.confirmed",
    entityType: "Order",
    entityId: updated.id,
    meta: { orderNumber: updated.orderNumber },
  });

  return { ok: true, order: updated };
}

export async function getOrderForUser(
  user: SessionUser | null | undefined,
  orderId: string,
) {
  const u = requireAuth(user);
  return prisma.order.findFirst({
    where: { id: orderId, userId: u.id },
    include: {
      items: true,
      vendorOrders: true,
      payments: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
}
