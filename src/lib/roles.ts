import type { Role } from "@/lib/types";

/** Roles that can operate the admin console. */
export function isStaffRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Roles that may open the vendor desk (own shop or platform). */
export function canAccessVendorDesk(role?: string | null): boolean {
  return role === "VENDOR" || isStaffRole(role);
}

export function staffHome(role?: Role | string | null): string {
  if (role === "SUPER_ADMIN") return "/super";
  if (role === "ADMIN") return "/admin";
  if (role === "VENDOR") return "/vendor";
  return "/account";
}
