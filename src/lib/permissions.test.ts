import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAdmin,
  isSuperAdmin,
  PermissionError,
  requireAdmin,
  requireSuperAdmin,
  requireVendorRole,
} from "./permissions";

const customer = {
  id: "1",
  email: "c@x.com",
  role: "CUSTOMER" as const,
  status: "ACTIVE",
};
const vendor = {
  id: "2",
  email: "v@x.com",
  role: "VENDOR" as const,
  status: "ACTIVE",
};
const admin = {
  id: "3",
  email: "a@x.com",
  role: "ADMIN" as const,
  status: "ACTIVE",
};
const superAdmin = {
  id: "4",
  email: "s@x.com",
  role: "SUPER_ADMIN" as const,
  status: "ACTIVE",
};

describe("permissions", () => {
  it("distinguishes admin vs super admin", () => {
    assert.equal(isAdmin(admin), true);
    assert.equal(isAdmin(superAdmin), true);
    assert.equal(isAdmin(customer), false);
    assert.equal(isSuperAdmin(admin), false);
    assert.equal(isSuperAdmin(superAdmin), true);
  });

  it("blocks normal admin from super-only gate", () => {
    assert.throws(() => requireSuperAdmin(admin), PermissionError);
    assert.equal(requireSuperAdmin(superAdmin).id, "4");
  });

  it("allows vendor and admin on vendor role gate; blocks customer", () => {
    assert.equal(requireVendorRole(vendor).id, "2");
    assert.equal(requireVendorRole(admin).id, "3");
    assert.throws(() => requireVendorRole(customer), PermissionError);
    assert.throws(() => requireAdmin(vendor), PermissionError);
  });
});
