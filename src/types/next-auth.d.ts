import type { Role } from "@/lib/types";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      status: string;
    };
  }

  interface User {
    role?: Role;
    status?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    status?: string;
  }
}
