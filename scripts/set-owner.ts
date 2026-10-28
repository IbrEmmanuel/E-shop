/**
 * Upsert a local owner admin from env:
 *   OWNER_EMAIL / OWNER_PASSWORD
 * or falls back to SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (
    process.env.OWNER_EMAIL ||
    process.env.SEED_ADMIN_EMAIL ||
    ""
  )
    .trim()
    .toLowerCase();
  const password = (
    process.env.OWNER_PASSWORD ||
    process.env.SEED_ADMIN_PASSWORD ||
    ""
  ).trim();

  if (!email || !password) {
    throw new Error(
      "Set OWNER_EMAIL and OWNER_PASSWORD (or SEED_ADMIN_*) in .env",
    );
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const hash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  const user = existing
    ? await prisma.user.update({
        where: { email },
        data: {
          name: existing.name || "Owner",
          passwordHash: hash,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
      })
    : await prisma.user.create({
        data: {
          email,
          name: "Owner",
          passwordHash: hash,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          customerProfile: { create: {} },
        },
      });

  console.log(`Ready: ${user.email} (${user.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
