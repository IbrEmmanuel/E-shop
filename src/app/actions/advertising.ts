"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rethrowNextControlFlow } from "@/lib/action-errors";
import { getSessionUser } from "@/lib/auth";
import { getGuestKey } from "@/lib/guest";
import {
  addCreative,
  createCampaign,
  recordAdEvent,
  updateCampaignStatus,
  upsertAudienceConsent,
} from "@/services/advertising";

export type AdActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function createCampaignAction(
  _prev: AdActionResult | null,
  formData: FormData,
): Promise<AdActionResult> {
  const user = await getSessionUser();
  const budgetMajor = Number(formData.get("budget") ?? 0);
  try {
    const campaign = await createCampaign(user, {
      name: String(formData.get("name") ?? ""),
      objective: String(formData.get("objective") || "AWARENESS") as
        | "AWARENESS"
        | "TRAFFIC"
        | "CONVERSIONS",
      budgetMinor: Number.isFinite(budgetMajor)
        ? Math.round(budgetMajor * 100)
        : 0,
      vendorId: formData.get("vendorId")
        ? String(formData.get("vendorId"))
        : null,
      startAt: formData.get("startAt")
        ? String(formData.get("startAt"))
        : null,
      endAt: formData.get("endAt") ? String(formData.get("endAt")) : null,
    });
    revalidatePath("/admin/advertising");
    redirect(`/admin/advertising/${campaign.id}`);
  } catch (e) {
    rethrowNextControlFlow(e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create campaign",
    };
  }
}

export async function setCampaignStatusAction(formData: FormData) {
  const user = await getSessionUser();
  const id = String(formData.get("campaignId") ?? "");
  const status = String(formData.get("status") ?? "");
  await updateCampaignStatus(user, id, status);
  revalidatePath("/admin/advertising");
  revalidatePath(`/admin/advertising/${id}`);
}

export async function addCreativeAction(
  _prev: AdActionResult | null,
  formData: FormData,
): Promise<AdActionResult> {
  const user = await getSessionUser();
  const campaignId = String(formData.get("campaignId") ?? "");
  try {
    const creative = await addCreative(user, campaignId, {
      type: String(formData.get("type") || "SPONSORED_PRODUCT") as
        | "SPONSORED_PRODUCT"
        | "BANNER",
      productId: formData.get("productId")
        ? String(formData.get("productId"))
        : null,
      title: String(formData.get("title") ?? ""),
      body: formData.get("body") ? String(formData.get("body")) : null,
      imageUrl: formData.get("imageUrl")
        ? String(formData.get("imageUrl"))
        : null,
      linkUrl: formData.get("linkUrl") ? String(formData.get("linkUrl")) : null,
    });
    revalidatePath(`/admin/advertising/${campaignId}`);
    return { ok: true, id: creative.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not add creative",
    };
  }
}

export async function trackSponsoredClickAction(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "");
  const creativeId = String(formData.get("creativeId") ?? "") || null;
  const productId = String(formData.get("productId") ?? "") || null;
  const href = String(formData.get("href") ?? "/shop");
  const user = await getSessionUser();
  const guestKey = user ? null : await getGuestKey();
  await recordAdEvent({
    campaignId,
    creativeId,
    productId,
    eventType: "CLICK",
    userId: user?.id,
    guestKey,
    costMinor: 50, // test-mode CPC debit (0.50 major units)
  });
  redirect(href);
}

export async function saveAudienceConsentAction(formData: FormData) {
  const user = await getSessionUser();
  await upsertAudienceConsent(user, {
    analyticsOptIn: formData.get("analyticsOptIn") === "on",
    marketingOptIn: formData.get("marketingOptIn") === "on",
  });
  revalidatePath("/admin/profile");
  revalidatePath("/admin/advertising");
}
