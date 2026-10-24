"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { toggleFavourite } from "@/services/favourites";

export async function toggleFavouriteAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?callbackUrl=/shop");
  }
  const productId = String(formData.get("productId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  await toggleFavourite(user, productId);
  if (slug) revalidatePath(`/products/${slug}`);
  revalidatePath("/admin/profile");
  revalidatePath("/");
}
