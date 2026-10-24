"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/permissions";
import { checkRentalAllowsPublishing } from "@/services/rentals";
import { adminApproveApplication } from "@/services/vendors";
import { adminCreatePost, adminUpdatePost } from "@/services/blog";

export type AdminActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function approveVendorAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const user = await getSessionUser();
  const applicationId = String(formData.get("applicationId") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") || "") || undefined;
  try {
    await adminApproveApplication(user, applicationId, { reviewNotes });
    revalidatePath("/admin/vendors");
    return { ok: true, message: "Vendor approved." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Approve failed" };
  }
}

export async function rejectVendorAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const user = await getSessionUser();
  try {
    const admin = requireAdmin(user);
    const applicationId = String(formData.get("applicationId") ?? "");
    const reviewNotes = String(formData.get("reviewNotes") || "") || null;
    const app = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) return { ok: false, error: "Application not found" };
    if (app.status === "APPROVED") {
      return { ok: false, error: "Already approved" };
    }
    await prisma.vendorApplication.update({
      where: { id: applicationId },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewNotes,
      },
    });
    await writeAuditLog({
      actorId: admin.id,
      action: "vendor.application.rejected",
      entityType: "VendorApplication",
      entityId: applicationId,
    });
    revalidatePath("/admin/vendors");
    return { ok: true, message: "Application rejected." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Reject failed" };
  }
}

export async function moderateProductAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const user = await getSessionUser();
  try {
    const admin = requireAdmin(user);
    const productId = String(formData.get("productId") ?? "");
    const status = String(formData.get("status") ?? "") as
      | "PUBLISHED"
      | "REJECTED"
      | "ARCHIVED"
      | "DRAFT";
    if (!["PUBLISHED", "REJECTED", "ARCHIVED", "DRAFT"].includes(status)) {
      return { ok: false, error: "Invalid status" };
    }
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return { ok: false, error: "Product not found" };

    if (status === "PUBLISHED") {
      const gate = await checkRentalAllowsPublishing(product.vendorId);
      if (!gate.allowed) {
        return {
          ok: false,
          error: gate.reason || "Vendor rental does not allow publishing",
        };
      }
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        status,
        publishedAt:
          status === "PUBLISHED"
            ? (product.publishedAt ?? new Date())
            : product.publishedAt,
      },
    });
    await writeAuditLog({
      actorId: admin.id,
      action: "product.moderated",
      entityType: "Product",
      entityId: productId,
      meta: { status },
    });
    revalidatePath("/admin/products");
    return { ok: true, message: `Product set to ${status}.` };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Moderation failed",
    };
  }
}

export type BlogSaveResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveBlogPostAction(
  _prev: BlogSaveResult | null,
  formData: FormData,
): Promise<BlogSaveResult> {
  const user = await getSessionUser();
  const postId = String(formData.get("postId") || "");
  const tagsRaw = String(formData.get("tags") || "");
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const payload = {
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || "") || undefined,
    excerpt: String(formData.get("excerpt") || "") || null,
    body: String(formData.get("body") || ""),
    status: (String(formData.get("status") || "DRAFT") as
      | "DRAFT"
      | "PUBLISHED"
      | "ARCHIVED"),
    seoTitle: String(formData.get("seoTitle") || "") || null,
    seoDescription: String(formData.get("seoDescription") || "") || null,
    tags,
  };

  try {
    if (postId) {
      await adminUpdatePost(user, postId, payload);
      revalidatePath("/admin/blog");
      revalidatePath("/blog");
      revalidatePath("/sitemap.xml");
      redirect(`/admin/blog/${postId}/edit`);
    }
    const created = await adminCreatePost(user, payload);
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath("/sitemap.xml");
    redirect(`/admin/blog/${created.id}/edit`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Save failed",
    };
  }
}
