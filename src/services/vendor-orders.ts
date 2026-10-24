import type { Order, VendorOrder } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { requireAdmin, type SessionUser } from "@/lib/permissions";
import type { OrderStatus, VendorOrderStatus } from "@/lib/types";
import {
  nextVendorOrderAction,
  vendorOrderTabLabel,
  VENDOR_ORDER_TAB_STATUSES,
  type VendorOrderTab,
} from "@/lib/vendor-order-status";

export type { VendorOrderTab };
export {
  VENDOR_ORDER_TABS,
  nextVendorOrderAction,
  parseVendorOrderTab,
  vendorOrderTabLabel,
} from "@/lib/vendor-order-status";

export async function countVendorOrdersByTab(vendorId?: string | null) {
  const rows = await prisma.vendorOrder.groupBy({
    by: ["status"],
    where: vendorId ? { vendorId } : undefined,
    _count: { _all: true },
  });

  const byStatus = Object.fromEntries(
    rows.map((r) => [r.status, r._count._all]),
  ) as Record<string, number>;

  const sum = (keys: string[]) =>
    keys.reduce((n, k) => n + (byStatus[k] || 0), 0);

  return {
    all: rows.reduce((n, r) => n + r._count._all, 0),
    new: sum(["PAID"]),
    accepted: sum(["ACCEPTED", "PROCESSING"]),
    packaged: sum(["PACKAGED"]),
    shipped: sum(["SHIPPED", "DELIVERED"]),
  } satisfies Record<VendorOrderTab, number>;
}

export async function listVendorOrders(opts: {
  vendorId?: string | null;
  tab?: VendorOrderTab;
  take?: number;
}) {
  const tab = opts.tab ?? "all";
  const statuses = VENDOR_ORDER_TAB_STATUSES[tab];
  return prisma.vendorOrder.findMany({
    where: {
      ...(opts.vendorId ? { vendorId: opts.vendorId } : {}),
      ...(statuses ? { status: { in: statuses } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 80,
    include: {
      items: true,
      vendor: { select: { storeName: true, slug: true } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          shippingName: true,
          shippingLine1: true,
          shippingCity: true,
          shippingState: true,
          shippingPhone: true,
          etaEarliestAt: true,
          etaLatestAt: true,
          currency: true,
        },
      },
    },
  });
}

/**
 * Admin-only fulfillment: Accept → Package → Ship → Deliver.
 * Parent Order status syncs for customer tracking.
 */
export async function advanceVendorOrderStatus(opts: {
  vendorOrderId: string;
  user: SessionUser;
  status: VendorOrderStatus;
}): Promise<
  | { ok: true; vendorOrder: VendorOrder; order: Order }
  | { ok: false; error: string }
> {
  try {
    requireAdmin(opts.user);
  } catch {
    return { ok: false, error: "Admin access required." };
  }

  const allowed: VendorOrderStatus[] = [
    "ACCEPTED",
    "PACKAGED",
    "SHIPPED",
    "DELIVERED",
  ];
  if (!allowed.includes(opts.status)) {
    return { ok: false, error: "Invalid status" };
  }

  const existing = await prisma.vendorOrder.findUnique({
    where: { id: opts.vendorOrderId },
    include: { order: true, vendor: true },
  });
  if (!existing) return { ok: false, error: "Order not found" };

  if (existing.order.status === "PENDING_PAYMENT") {
    return { ok: false, error: "Payment must be approved before fulfillment." };
  }
  if (
    existing.order.status === "CANCELLED" ||
    existing.order.status === "REFUNDED"
  ) {
    return { ok: false, error: "Order is closed." };
  }

  const expected = nextVendorOrderAction(existing.status);
  if (!expected || expected.next !== opts.status) {
    return {
      ok: false,
      error: `Cannot move from ${vendorOrderTabLabel(existing.status)} to ${vendorOrderTabLabel(opts.status)}.`,
    };
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const vendorOrder = await tx.vendorOrder.update({
      where: { id: existing.id },
      data: { status: opts.status },
    });

    const siblings = await tx.vendorOrder.findMany({
      where: { orderId: existing.orderId },
      select: { status: true },
    });

    const parentPatch = deriveParentOrderStatus({
      current: existing.order.status as OrderStatus,
      vendorStatuses: siblings.map((s) => s.status),
      advancingTo: opts.status,
      storeName: existing.vendor.storeName,
      city: existing.order.shippingCity,
      etaLatestAt: existing.order.etaLatestAt,
      line1: existing.order.shippingLine1,
    });

    let order = existing.order;
    if (parentPatch) {
      order = await tx.order.update({
        where: { id: existing.orderId },
        data: {
          status: parentPatch.status,
          ...(parentPatch.shippedAt ? { shippedAt: now } : {}),
          ...(parentPatch.deliveredAt ? { deliveredAt: now } : {}),
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: existing.orderId,
          status: parentPatch.historyStatus,
          note: parentPatch.note,
        },
      });
    } else if (opts.status === "PACKAGED") {
      await tx.orderStatusHistory.create({
        data: {
          orderId: existing.orderId,
          status: "PROCESSING",
          note: `Admin marked ${existing.vendor.storeName} items as packaged.`,
        },
      });
    }

    return { vendorOrder, order };
  });

  await writeAuditLog({
    actorId: opts.user.id,
    action: "vendor.order.fulfillment",
    entityType: "VendorOrder",
    entityId: result.vendorOrder.id,
    meta: {
      status: opts.status,
      orderNumber: result.order.orderNumber,
    },
  });

  return { ok: true, vendorOrder: result.vendorOrder, order: result.order };
}

function deriveParentOrderStatus(opts: {
  current: OrderStatus;
  vendorStatuses: string[];
  advancingTo: VendorOrderStatus;
  storeName: string;
  city: string | null;
  etaLatestAt: Date | null;
  line1: string | null;
}): {
  status: OrderStatus;
  historyStatus: string;
  note: string;
  shippedAt?: boolean;
  deliveredAt?: boolean;
} | null {
  const statuses = opts.vendorStatuses;
  const allShipped = statuses.every((s) =>
    ["SHIPPED", "DELIVERED"].includes(s),
  );
  const allDelivered = statuses.every((s) => s === "DELIVERED");
  const anyActive = statuses.some((s) =>
    ["ACCEPTED", "PROCESSING", "PACKAGED", "SHIPPED", "DELIVERED"].includes(s),
  );

  if (opts.advancingTo === "DELIVERED" && allDelivered) {
    return {
      status: "DELIVERED",
      historyStatus: "DELIVERED",
      note: `Delivered to ${opts.line1 || "customer address"}.`,
      deliveredAt: true,
    };
  }

  if (opts.advancingTo === "SHIPPED" && allShipped) {
    return {
      status: "SHIPPED",
      historyStatus: "SHIPPED",
      note: `Out for delivery toward ${opts.city || "your location"}${
        opts.etaLatestAt
          ? ` · expected by ${opts.etaLatestAt.toLocaleDateString("en-NG", {
              timeZone: "Africa/Lagos",
            })}`
          : ""
      }.`,
      shippedAt: true,
    };
  }

  if (
    (opts.advancingTo === "ACCEPTED" || opts.advancingTo === "PACKAGED") &&
    anyActive &&
    opts.current === "PAID"
  ) {
    return {
      status: "PROCESSING",
      historyStatus: "PROCESSING",
      note:
        opts.advancingTo === "ACCEPTED"
          ? `Admin accepted ${opts.storeName} order — packing in progress.`
          : `Admin packaged ${opts.storeName} items — ready to ship.`,
    };
  }

  return null;
}
