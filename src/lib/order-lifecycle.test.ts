import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  adminMayRefundOrder,
  assertOrderTransition,
  assertVendorOrderTransition,
  canTransitionOrder,
  canTransitionPayment,
  canTransitionVendorOrder,
  customerMayCancelOrder,
  InvalidTransitionError,
  rollupParentOrderStatus,
} from "./order-lifecycle";
import { commissionFromGross } from "./commission";

describe("order lifecycle", () => {
  it("allows PENDING_PAYMENT → PAID and blocks DELIVERED → PAID", () => {
    assert.equal(canTransitionOrder("PENDING_PAYMENT", "PAID"), true);
    assert.equal(canTransitionOrder("DELIVERED", "PAID"), false);
    assert.throws(
      () => assertOrderTransition("CANCELLED", "PAID"),
      InvalidTransitionError,
    );
  });

  it("payment succeeded only refunds; forged succeed from failed is allowed via retry PENDING path", () => {
    assert.equal(canTransitionPayment("PENDING", "SUCCEEDED"), true);
    assert.equal(canTransitionPayment("SUCCEEDED", "PENDING"), false);
    assert.equal(canTransitionPayment("SUCCEEDED", "REFUNDED"), true);
  });

  it("vendor fulfilment is sequential Accept → Package → Ship → Deliver", () => {
    assert.equal(canTransitionVendorOrder("PAID", "ACCEPTED"), true);
    assert.equal(canTransitionVendorOrder("PAID", "SHIPPED"), false);
    assert.throws(
      () => assertVendorOrderTransition("PACKAGED", "DELIVERED"),
      InvalidTransitionError,
    );
  });

  it("customer cancel / admin refund rules", () => {
    assert.equal(customerMayCancelOrder("PENDING_PAYMENT"), true);
    assert.equal(customerMayCancelOrder("PAID"), false);
    assert.equal(adminMayRefundOrder("PAID"), true);
    assert.equal(adminMayRefundOrder("PENDING_PAYMENT"), false);
    assert.equal(adminMayRefundOrder("REFUNDED"), false);
  });

  it("rolls up multi-vendor statuses", () => {
    assert.equal(
      rollupParentOrderStatus(["ACCEPTED", "PACKAGED"]),
      "PROCESSING",
    );
    assert.equal(
      rollupParentOrderStatus(["SHIPPED", "DELIVERED"]),
      "SHIPPED",
    );
    assert.equal(
      rollupParentOrderStatus(["DELIVERED", "DELIVERED"]),
      "DELIVERED",
    );
  });
});

describe("commission", () => {
  it("applies 10% (1000 bps) on vendor gross, not silent 12%", () => {
    const r = commissionFromGross({ grossMinor: 1_000_000, commissionBps: 1000 });
    assert.equal(r.commissionMinor, 100_000);
    assert.equal(r.vendorNetMinor, 900_000);
  });

  it("clamps invalid bps", () => {
    const r = commissionFromGross({ grossMinor: 1000, commissionBps: 50_000 });
    assert.equal(r.commissionMinor, 1000);
    assert.equal(r.vendorNetMinor, 0);
  });
});
