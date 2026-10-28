"use server";

import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";

export type ResetActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordResetAction(
  _prev: ResetActionResult | null,
  formData: FormData,
): Promise<ResetActionResult> {
  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  if (!z.string().email().safeParse(email).success) {
    return { ok: false, error: "Enter a valid email." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success-shaped message to avoid email enumeration
  const generic = {
    ok: true as const,
    message:
      "If that email is registered, a reset link is on the way (check spam).",
  };

  if (!user?.passwordHash) return generic;

  const raw = randomBytes(32).toString("hex");
  const token = hashToken(raw);
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({
    where: { identifier: `password-reset:${email}` },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: `password-reset:${email}`,
      token,
      expires,
    },
  });

  const link = siteUrl(`/reset-password?token=${raw}&email=${encodeURIComponent(email)}`);
  await sendEmail({
    to: email,
    subject: "Reset your E-Shop password",
    html: `<p>Reset your password using this link (valid 1 hour):</p><p><a href="${link}">${link}</a></p>`,
    text: `Reset your password (valid 1 hour): ${link}`,
  });

  return generic;
}

export async function resetPasswordAction(
  _prev: ResetActionResult | null,
  formData: FormData,
): Promise<ResetActionResult> {
  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  const rawToken = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirmPassword") || "");

  if (!email || !rawToken) return { ok: false, error: "Invalid reset link." };
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords do not match." };
  }

  const token = hashToken(rawToken);
  const row = await prisma.verificationToken.findFirst({
    where: {
      identifier: `password-reset:${email}`,
      token,
      expires: { gt: new Date() },
    },
  });
  if (!row) {
    return { ok: false, error: "Reset link is invalid or expired." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false, error: "Account not found." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
  await prisma.verificationToken.deleteMany({
    where: { identifier: `password-reset:${email}` },
  });

  redirect("/login?reset=1");
}
