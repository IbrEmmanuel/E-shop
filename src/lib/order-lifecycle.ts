/**
 * Canonical order / payment / vendor-fulfilment state machines.
 * Keep transitions here — services must call assert* before mutating status.
 */
import type { OrderStatus, PaymentStatus, VendorOrderStatus } from "@/lib/types";

export class InvalidTransitionError extends Error {
  status = 409;
  constructor(
    public readonly kind: "order" | "payment" | "vendor_order",
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Invalid ${kind} transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

/** Parent marketplace order (payment + high-level fulfilment). */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

/**
 * Payment record status. Succeeded / refunded are terminal for provider truth;
 * REQUIRES_ACTION covers bank-transfer proof awaiting admin confirmation.
 */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> =
  {
    PENDING: ["REQUIRES_ACTION", "SUCCEEDED", "FAILED", "REFUNDED"],
    REQUIRES_ACTION: ["SUCCEEDED", "FAILED", "PENDING", "REFUNDED"],
    SUCCEEDED: ["REFUNDED"],
    FAILED: ["PENDING", "REQUIRES_ACTION"],
    REFUNDED: [],
  };

/** Per-vendor fulfilment pipeline (VendorOrder.status). */
export const VENDOR_ORDER_TRANSITIONS: Record<
  string,
  readonly VendorOrderStatus[]
> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PACKAGED", "CANCELLED"],
  PROCESSING: ["PACKAGED", "CANCELLED"], // legacy alias of ACCEPTED
  PACKAGED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransitionOrder(
  from: string,
  to: string,
): boolean {
  if (from === to) return true;
  const allowed = ORDER_TRANSITIONS[from as OrderStatus];
  return Boolean(allowed?.includes(to as OrderStatus));
}

export function canTransitionPayment(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = PAYMENT_TRANSITIONS[from as PaymentStatus];
  return Boolean(allowed?.includes(to as PaymentStatus));
}

export function canTransitionVendorOrder(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = VENDOR_ORDER_TRANSITIONS[from];
  return Boolean(allowed?.includes(to as VendorOrderStatus));
}

export function assertOrderTransition(from: string, to: string): void {
  if (!canTransitionOrder(from, to)) {
    throw new InvalidTransitionError("order", from, to);
  }
}

export function assertPaymentTransition(from: string, to: string): void {
  if (!canTransitionPayment(from, to)) {
    throw new InvalidTransitionError("payment", from, to);
  }
}

export function assertVendorOrderTransition(from: string, to: string): void {
  if (!canTransitionVendorOrder(from, to)) {
    throw new InvalidTransitionError("vendor_order", from, to);
  }
}

/** Customer may cancel only while unpaid. */
export function customerMayCancelOrder(status: string): boolean {
  return status === "PENDING_PAYMENT";
}

/** Admin may refund any non-terminal paid/fulfilment state. */
export function adminMayRefundOrder(status: string): boolean {
  if (
    status === "PENDING_PAYMENT" ||
    status === "CANCELLED" ||
    status === "REFUNDED"
  ) {
    return false;
  }
  return ORDER_TRANSITIONS[status as OrderStatus]?.includes("REFUNDED") ?? false;
}

/**
 * Map multi-vendor fulfilment into a single parent Order status.
 * All delivered → DELIVERED; any shipped (and none pending) → SHIPPED; else PROCESSING.
 */
export function rollupParentOrderStatus(
  vendorStatuses: string[],
): Extract<OrderStatus, "PROCESSING" | "SHIPPED" | "DELIVERED"> {
  const normalized = vendorStatuses.map((s) =>
    s === "PROCESSING" ? "ACCEPTED" : s,
  );
  if (normalized.length === 0) return "PROCESSING";
  if (normalized.every((s) => s === "DELIVERED")) return "DELIVERED";
  if (
    normalized.every((s) =>
      ["SHIPPED", "DELIVERED"].includes(s),
    )
  ) {
    return "SHIPPED";
  }
  return "PROCESSING";
}
