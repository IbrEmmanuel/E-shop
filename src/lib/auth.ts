import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/types";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT + credentials only — Prisma adapter is unused for sessions and can
  // interfere with credential sign-in on serverless.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash || user.status === "DISABLED") return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        // Optional bootstrap: SUPER_ADMIN_EMAIL elevates the platform owner once.
        let role = user.role as Role;
        const superEmails = (process.env.SUPER_ADMIN_EMAIL || "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        if (
          superEmails.includes(user.email.toLowerCase()) &&
          role !== "SUPER_ADMIN"
        ) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: "SUPER_ADMIN" },
          });
          role = "SUPER_ADMIN";
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: Role }).role ?? "CUSTOMER";
        token.status = (user as { status?: string }).status ?? "ACTIVE";
        token.sub = user.id;
      } else if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, status: true, email: true, name: true },
        });
        if (dbUser && dbUser.status !== "DISABLED") {
          token.role = dbUser.role as Role;
          token.status = dbUser.status;
          token.email = dbUser.email;
          token.name = dbUser.name;
          delete token.error;
        } else {
          // Stale JWT after DB reset / deleted user — force re-auth
          token.error = "UserNotFound";
          delete token.sub;
          delete token.role;
          delete token.status;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.error === "UserNotFound" || !token.sub) {
        return { ...session, user: undefined };
      }
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = (token.role as Role) ?? "CUSTOMER";
        session.user.status = (token.status as string) ?? "ACTIVE";
      }
      return session;
    },
  },
  trustHost: true,
});

export async function getSessionUser() {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    // Always re-check DB so carts/admin never use deleted user IDs after a reseed.
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });
    if (!dbUser || dbUser.status === "DISABLED") return null;

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as Role,
      status: dbUser.status,
    };
  } catch {
    // Missing AUTH_SECRET / DB on Vercel must not take down the whole storefront.
    return null;
  }
}
