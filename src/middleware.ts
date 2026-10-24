import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  if (pathname.startsWith("/admin") && !token) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // Legacy vendor desk URLs → sell / account (keep /vendor/apply)
  if (
    pathname.startsWith("/vendor") &&
    pathname !== "/vendor/apply" &&
    !pathname.startsWith("/vendor/apply/")
  ) {
    return NextResponse.redirect(new URL("/sell", req.nextUrl.origin));
  }

  if (pathname.startsWith("/vendor/apply") && !token) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/vendor", "/vendor/:path*"],
};
