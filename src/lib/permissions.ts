import type { Role } from "@/lib/types";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  status?: string;
};

export function isAdmin(user?: SessionUser | null): boolean {
  return user?.role === "ADMIN" && user.status !== "DISABLED";
}

export function isVendor(user?: SessionUser | null): boolean {
  return user?.role === "VENDOR" && user.status !== "DISABLED";
}

export function isCustomer(user?: SessionUser | null): boolean {
  return Boolean(user) && user!.status !== "DISABLED";
}

export function requireAuth(user?: SessionUser | null): SessionUser {
  if (!user || user.status === "DISABLED") {
    throw new PermissionError("Authentication required");
  }
  return user;
}

export function requireAdmin(user?: SessionUser | null): SessionUser {
  const u = requireAuth(user);
  if (u.role !== "ADMIN") throw new PermissionError("Admin access required");
  return u;
}

export function requireVendorRole(user?: SessionUser | null): SessionUser {
  const u = requireAuth(user);
  if (u.role !== "VENDOR" && u.role !== "ADMIN") {
    throw new PermissionError("Vendor access required");
  }
  return u;
}

export class PermissionError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export class AuthRequiredError extends Error {
  status = 401;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}
