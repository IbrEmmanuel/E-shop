import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function isStaff(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.AUTH_SECRET;
  const token = secret
    ? await getToken({
        req,
        secret,
        secureCookie: req.nextUrl.protocol === "https:",
      })
    : null;

  const role = String(token?.role ?? "");

  // Super-admin desk — Node layout also enforces
  if (pathname === "/super" || pathname.startsWith("/super/")) {
    if (!token) {
      const login = new URL("/login", req.nextUrl.origin);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
    if (role !== "SUPER_ADMIN") {
      return NextResponse.redirect(
        new URL(isStaff(role) ? "/admin" : "/", req.nextUrl.origin),
      );
    }
  }

  const isVendorApply =
    pathname === "/vendor/apply" || pathname.startsWith("/vendor/apply/");
  const isVendorDesk =
    pathname === "/vendor" ||
    (pathname.startsWith("/vendor/") && !isVendorApply);

  const callbackPath = `${pathname}${req.nextUrl.search}`;

  if (isVendorDesk) {
    if (!token) {
      const login = new URL("/login", req.nextUrl.origin);
      login.searchParams.set("callbackUrl", callbackPath);
      return NextResponse.redirect(login);
    }
    if (role !== "VENDOR" && !isStaff(role)) {
      return NextResponse.redirect(new URL("/sell", req.nextUrl.origin));
    }
  }

  if (isVendorApply && secret && !token) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", callbackPath);
    return NextResponse.redirect(login);
  }

  // Expose pathname to server layouts (apply vs desk gating).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/super",
    "/super/:path*",
    "/vendor",
    "/vendor/:path*",
  ],
};
