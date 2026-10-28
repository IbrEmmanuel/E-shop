"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getGuestKey, getOrCreateGuestKey } from "@/lib/guest";
import {
  addToCart,
  removeCartItem,
  updateCartItemQty,
} from "@/services/cart";

async function cartIdentity() {
  const user = await getSessionUser();
  if (user) return { userId: user.id, guestKey: null as string | null };
  const guestKey = await getOrCreateGuestKey();
  return { userId: null as string | null, guestKey };
}

export async function addToCartAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const variantId = formData.get("variantId")
    ? String(formData.get("variantId"))
    : null;
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1) || 1);
  const { userId, guestKey } = await cartIdentity();
  await addToCart({ userId, guestKey, productId, variantId, quantity });
  revalidatePath("/cart");
  revalidatePath("/");
}

export async function updateCartItemAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const quantity = Math.max(0, Number(formData.get("quantity") ?? 0) || 0);
  const user = await getSessionUser();
  const guestKey = user ? null : await getGuestKey();
  if (!user && !guestKey) throw new Error("No cart session");
  await updateCartItemQty({
    userId: user?.id,
    guestKey,
    itemId,
    quantity,
  });
  revalidatePath("/cart");
}

export async function removeCartItemAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const user = await getSessionUser();
  const guestKey = user ? null : await getGuestKey();
  if (!user && !guestKey) throw new Error("No cart session");
  await removeCartItem({ userId: user?.id, guestKey, itemId });
  revalidatePath("/cart");
}

export async function buyNowAction(formData: FormData) {
  await addToCartAction(formData);
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?callbackUrl=/checkout");
  }
  redirect("/checkout");
}
