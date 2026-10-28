"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { submitProductReview } from "@/services/reviews";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function submitReviewAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  const productId = String(formData.get("productId") || "");
  const rating = Number(formData.get("rating") || 0);
  const title = String(formData.get("title") || "") || undefined;
  const body = String(formData.get("body") || "");

  try {
    const review = await submitProductReview(user, {
      productId,
      rating,
      title,
      body,
    });
    const product = await prisma.product.findUnique({
      where: { id: review.productId },
      select: { slug: true },
    });
    if (product) revalidatePath(`/products/${product.slug}`);
    return { ok: true, message: "Review published." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save review",
    };
  }
}
