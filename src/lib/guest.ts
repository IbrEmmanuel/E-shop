import { cookies } from "next/headers";
import { nanoid } from "nanoid";

export const GUEST_COOKIE = "eshop_guest";

export async function getOrCreateGuestKey(): Promise<string> {
  const store = await cookies();
  const existing = store.get(GUEST_COOKIE)?.value;
  if (existing) return existing;
  const key = nanoid(24);
  store.set(GUEST_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return key;
}

export async function getGuestKey(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value ?? null;
}

export async function clearGuestKey() {
  const store = await cookies();
  store.delete(GUEST_COOKIE);
}
