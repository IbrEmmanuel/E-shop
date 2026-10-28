"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clearGuestKey, getGuestKey } from "@/lib/guest";
import { mergeGuestCart } from "@/services/cart";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please check your name, email, and password (min 8 characters)." };
  }

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false, error: "An account with this email already exists." };

  const refCode = String(formData.get("ref") || "")
    .trim()
    .toUpperCase();
  const referrer = refCode
    ? await prisma.user.findUnique({ where: { referralCode: refCode } })
    : null;

  const nameParts = parsed.data.name.trim().split(/\s+/);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const phone = String(formData.get("phone") || "").trim() || null;

  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      firstName: nameParts[0] || null,
      lastName: nameParts.slice(1).join(" ") || null,
      passwordHash,
      role: "CUSTOMER",
      referredById: referrer?.id ?? null,
      customerProfile: { create: { phone } },
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: "Account created but sign-in failed. Please log in." };
    }
    throw e;
  }

  const { sendEmailVerification } = await import(
    "@/services/email-verification"
  );
  await sendEmailVerification(email).catch(() => undefined);

  const guestKey = await getGuestKey();
  if (guestKey) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await mergeGuestCart(user.id, guestKey);
      await clearGuestKey();
    }
  }

  const callbackUrl = String(formData.get("callbackUrl") ?? "/account");
  let dest = callbackUrl.startsWith("/") ? callbackUrl : "/account";
  if (dest === "/") dest = "/account";
  await signIn("credentials", {
    email,
    password: parsed.data.password,
    redirectTo: dest,
  });

  redirect(dest);
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");

  const dbUser = await prisma.user.findUnique({ where: { email } });
  const role = dbUser?.role;
  const fallback =
    role === "SUPER_ADMIN"
      ? "/super"
      : role === "ADMIN"
        ? "/admin"
        : role === "VENDOR"
          ? "/vendor"
          : "/account";
  let dest = callbackUrl.startsWith("/") ? callbackUrl : fallback;
  const wantsAccountHome =
    callbackUrl === "/account" ||
    callbackUrl === "/" ||
    callbackUrl.startsWith("/account");
  if (wantsAccountHome && role === "SUPER_ADMIN") dest = "/super";
  if (wantsAccountHome && role === "ADMIN") dest = "/admin";
  if (wantsAccountHome && role === "VENDOR") dest = "/vendor";
  if (dest === "/vendor" || dest.startsWith("/vendor/")) {
    if (
      !dest.startsWith("/vendor/apply") &&
      role !== "VENDOR" &&
      role !== "ADMIN" &&
      role !== "SUPER_ADMIN"
    ) {
      dest = fallback;
    }
  }
  if (dest === "/super" || dest.startsWith("/super/")) {
    if (role !== "SUPER_ADMIN") dest = fallback;
  }
  if (dest === "/" && role === "CUSTOMER") dest = "/account";
  if (dest === "/" && role === "VENDOR") dest = "/vendor";
  if (dest === "/" && role === "ADMIN") dest = "/admin";
  if (dest === "/" && role === "SUPER_ADMIN") dest = "/super";

  try {
    // Authenticate first (no redirect) so we can merge the guest cart,
    // then redirect via Auth.js so the session cookie is set on the response.
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      // CredentialsSignin = bad email/password; other AuthError types are config/host issues.
      if (e.type === "CredentialsSignin") {
        return { ok: false, error: "Invalid email or password." };
      }
      console.error("[loginAction] AuthError", e.type, e.message);
      return {
        ok: false,
        error: "Sign-in failed. Check AUTH_URL matches this site origin and try again.",
      };
    }
    throw e;
  }

  const guestKey = await getGuestKey();
  if (guestKey && dbUser) {
    await mergeGuestCart(dbUser.id, guestKey);
    await clearGuestKey();
  }

  // Use Auth.js redirect so Set-Cookie from signIn is not dropped by next/navigation redirect().
  await signIn("credentials", {
    email,
    password,
    redirectTo: dest,
  });

  return { ok: true };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
