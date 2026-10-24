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
  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      firstName: nameParts[0] || null,
      lastName: nameParts.slice(1).join(" ") || null,
      passwordHash,
      role: "CUSTOMER",
      referredById: referrer?.id ?? null,
      customerProfile: { create: {} },
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

  const guestKey = await getGuestKey();
  if (guestKey) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await mergeGuestCart(user.id, guestKey);
      await clearGuestKey();
    }
  }

  redirect("/");
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: "Invalid email or password." };
    }
    throw e;
  }

  const dbUser = await prisma.user.findUnique({ where: { email } });
  const guestKey = await getGuestKey();
  if (guestKey && dbUser) {
    await mergeGuestCart(dbUser.id, guestKey);
    await clearGuestKey();
  }

  const fallback = dbUser?.role === "ADMIN" ? "/admin" : "/";
  let dest = callbackUrl.startsWith("/") ? callbackUrl : fallback;
  if (
    (callbackUrl === "/account" ||
      callbackUrl === "/" ||
      callbackUrl.startsWith("/account")) &&
    dbUser?.role === "ADMIN"
  ) {
    dest = "/admin";
  }
  // Legacy vendor desk / account hub
  if (dest === "/vendor" || dest.startsWith("/vendor/")) {
    if (dest.startsWith("/vendor/apply")) redirect(dest);
    redirect(fallback);
  }
  if (dest === "/account" || dest === "/account/addresses") {
    redirect(fallback);
  }
  redirect(dest);
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
