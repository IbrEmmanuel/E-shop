import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendEmailVerification(email: string): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) return;
  if (user.emailVerified) return;

  const raw = randomBytes(32).toString("hex");
  const token = hashToken(raw);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const identifier = `email-verify:${normalized}`;

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  const link = siteUrl(
    `/verify-email?token=${raw}&email=${encodeURIComponent(normalized)}`,
  );
  await sendEmail({
    to: normalized,
    subject: "Verify your email for E-Shop selling",
    html: `<p>Confirm your email to continue your seller application:</p><p><a href="${link}">${link}</a></p><p>Link expires in 24 hours.</p>`,
    text: `Verify your email: ${link}`,
  });
}

export async function confirmEmailVerification(
  email: string,
  rawToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = email.toLowerCase().trim();
  const token = hashToken(rawToken);
  const row = await prisma.verificationToken.findFirst({
    where: {
      identifier: `email-verify:${normalized}`,
      token,
      expires: { gt: new Date() },
    },
  });
  if (!row) return { ok: false, error: "Link is invalid or expired." };

  await prisma.user.update({
    where: { email: normalized },
    data: { emailVerified: new Date() },
  });
  await prisma.verificationToken.deleteMany({
    where: { identifier: `email-verify:${normalized}` },
  });
  return { ok: true };
}
