"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseMoneyToMinor } from "@/lib/money";
import { slugify, uniqueSlug } from "@/lib/slug";
import { writeAuditLog } from "@/lib/audit";
import { checkRentalAllowsPublishing } from "@/services/rentals";
import { advanceVendorOrderStatus } from "@/services/vendor-orders";
import type { VendorOrderStatus } from "@/lib/types";
import { requireOwnedVendor } from "@/services/vendors";
import {
  addApplicationDocument,
  saveApplicationDraft,
  submitVendorApplication,
} from "@/services/vendor-application";
import { saveUpload } from "@/lib/storage";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function saveVendorApplicationDraftAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  try {
    const categoryIds = formData.getAll("categoryIds").map(String).filter(Boolean);
    await saveApplicationDraft(user, {
      wizardStep: Number(formData.get("wizardStep") || 1),
      storeName: String(formData.get("storeName") || ""),
      businessName: String(formData.get("businessName") || "") || null,
      businessType: String(formData.get("businessType") || "") || null,
      description: String(formData.get("description") || "") || null,
      contactEmail: String(formData.get("contactEmail") || ""),
      contactPhone: String(formData.get("contactPhone") || "") || null,
      website: String(formData.get("website") || "") || null,
      businessAddress: String(formData.get("businessAddress") || "") || null,
      businessCity: String(formData.get("businessCity") || "") || null,
      businessState: String(formData.get("businessState") || "") || null,
      businessCountry: String(formData.get("businessCountry") || "NG"),
      shippingPolicy: String(formData.get("shippingPolicy") || "") || null,
      returnsPolicy: String(formData.get("returnsPolicy") || "") || null,
      processingDays: formData.get("processingDays")
        ? Number(formData.get("processingDays"))
        : null,
      taxId: String(formData.get("taxId") || "") || null,
      payoutBankName: String(formData.get("payoutBankName") || "") || null,
      payoutAccountName: String(formData.get("payoutAccountName") || "") || null,
      payoutAccountNumber: String(formData.get("payoutAccountNumber") || "") || null,
      rentalPlanId: String(formData.get("rentalPlanId") || "") || null,
      categoryIdsJson: JSON.stringify(categoryIds),
    });

    const logo = formData.get("logoFile");
    const banner = formData.get("bannerFile");
    if (logo instanceof File && logo.size > 0) {
      const up = await saveUpload(logo, { folder: "vendor-branding" });
      if (!up.ok) return { ok: false, error: up.reason };
      await saveApplicationDraft(user, { logoUrl: up.url });
    }
    if (banner instanceof File && banner.size > 0) {
      const up = await saveUpload(banner, { folder: "vendor-branding" });
      if (!up.ok) return { ok: false, error: up.reason };
      await saveApplicationDraft(user, { bannerUrl: up.url });
    }

    revalidatePath("/vendor/apply");
    return { ok: true, message: "Progress saved." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save application",
    };
  }
}

export async function uploadVendorDocumentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  try {
    const docType = String(formData.get("docType") || "other");
    const file = formData.get("document");
    if (!(file instanceof File) || file.size <= 0) {
      return { ok: false, error: "Choose a document image to upload." };
    }
    const up = await saveUpload(file, { folder: "vendor-kyc" });
    if (!up.ok) return { ok: false, error: up.reason };
    await addApplicationDocument(user, {
      docType,
      fileUrl: up.url,
      fileName: file.name,
      mimeType: file.type,
      label: String(formData.get("label") || "") || undefined,
    });
    revalidatePath("/vendor/apply");
    return { ok: true, message: "Document uploaded." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

export async function submitApplicationAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  try {
    // Persist last step fields before submit
    await saveVendorApplicationDraftAction(null, formData);
    await submitVendorApplication(user);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Application failed",
    };
  }
  redirect("/vendor/apply?submitted=1");
}

const productSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  sku: z.string().trim().min(1).max(64),
  price: z.string().trim().min(1),
  inventoryQty: z.coerce.number().int().min(0),
  categoryId: z.string().optional().nullable(),
  status: z
    .enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"])
    .default("DRAFT"),
  imageUrl: z.string().trim().optional().nullable(),
  seoTitle: z.string().trim().optional().nullable(),
  seoDescription: z.string().trim().optional().nullable(),
});

export async function createProductAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || ((user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") && user.role !== "VENDOR")) {
    return { ok: false, error: "Vendor access required." };
  }

  const vendorId = String(formData.get("vendorId") || "").trim();

  let vendor;
  try {
    vendor = await requireOwnedVendor(user, vendorId || undefined);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Vendor required" };
  }

  const parsed = productSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    inventoryQty: formData.get("inventoryQty"),
    categoryId: formData.get("categoryId") || null,
    status: formData.get("status") || "DRAFT",
    imageUrl: formData.get("imageUrl") || null,
    seoTitle: formData.get("seoTitle") || null,
    seoDescription: formData.get("seoDescription") || null,
  });
  if (!parsed.success) {
    return { ok: false, error: "Check product fields and try again." };
  }

  let priceMinor: number;
  try {
    priceMinor = parseMoneyToMinor(parsed.data.price);
  } catch {
    return {
      ok: false,
      error: "Invalid price. Use numbers only, e.g. 2500 or 2500.50",
    };
  }

  let imageUrl = parsed.data.imageUrl?.trim() || null;
  const imageFile = formData.get("imageFile");
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploaded = await saveUpload(imageFile, { folder: "products" });
    if (!uploaded.ok) return { ok: false, error: uploaded.reason };
    imageUrl = uploaded.url;
  }

  let status = parsed.data.status;
  if (status === "PUBLISHED") {
    if ((user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      status = "PENDING_REVIEW";
    } else {
      const gate = await checkRentalAllowsPublishing(vendor.id);
      if (!gate.allowed) status = "PENDING_REVIEW";
    }
  }

  const base = slugify(parsed.data.title) || "product";
  let slug = uniqueSlug(base, parsed.data.sku.toLowerCase());
  let n = 0;
  while (await prisma.product.findUnique({ where: { slug } })) {
    n += 1;
    slug = uniqueSlug(base, `${parsed.data.sku}-${n}`);
  }

  try {
    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        title: parsed.data.title,
        slug,
        description: parsed.data.description,
        sku: parsed.data.sku,
        priceMinor,
        inventoryQty: parsed.data.inventoryQty,
        categoryId: parsed.data.categoryId || null,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        seoTitle: parsed.data.seoTitle || null,
        seoDescription: parsed.data.seoDescription || null,
        images: imageUrl
          ? { create: [{ url: imageUrl, sortOrder: 0 }] }
          : undefined,
      },
    });
    await writeAuditLog({
      actorId: user!.id,
      action: "product.created",
      entityType: "Product",
      entityId: product.id,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create product",
    };
  }

  revalidatePath("/admin/vendors/products");
  revalidatePath("/vendor/products");
  redirect(user.role === "VENDOR" ? "/vendor/products" : "/admin/vendors/products");
}

export async function updateProductAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || ((user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") && user.role !== "VENDOR")) {
    return { ok: false, error: "Vendor access required." };
  }

  const productId = String(formData.get("productId") ?? "");
  const existing = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!existing) return { ok: false, error: "Product not found" };

  let vendor;
  try {
    vendor = await requireOwnedVendor(user, existing.vendorId);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Not allowed to edit this product",
    };
  }

  const parsed = productSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    inventoryQty: formData.get("inventoryQty"),
    categoryId: formData.get("categoryId") || null,
    status: formData.get("status") || existing.status,
    imageUrl: formData.get("imageUrl") || null,
    seoTitle: formData.get("seoTitle") || null,
    seoDescription: formData.get("seoDescription") || null,
  });
  if (!parsed.success) {
    return { ok: false, error: "Check product fields and try again." };
  }

  let priceMinor: number;
  try {
    priceMinor = parseMoneyToMinor(parsed.data.price);
  } catch {
    return {
      ok: false,
      error: "Invalid price. Use numbers only, e.g. 2500 or 2500.50",
    };
  }

  let status = parsed.data.status;
  if (status === "REJECTED" && (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    status = "PENDING_REVIEW";
  }
  if (status === "PUBLISHED" && (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    const gate = await checkRentalAllowsPublishing(vendor.id);
    if (!gate.allowed) {
      status = "PENDING_REVIEW";
    } else {
      status = "PENDING_REVIEW";
    }
  }

  let imageUrl = parsed.data.imageUrl?.trim() || null;
  const imageFile = formData.get("imageFile");
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploaded = await saveUpload(imageFile, { folder: "products" });
    if (!uploaded.ok) return { ok: false, error: uploaded.reason };
    imageUrl = uploaded.url;
  }

  await prisma.product.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      sku: parsed.data.sku,
      priceMinor,
      inventoryQty: parsed.data.inventoryQty,
      categoryId: parsed.data.categoryId || null,
      status,
      rejectionReason:
        status === "PENDING_REVIEW" || status === "PUBLISHED"
          ? null
          : existing.rejectionReason,
      publishedAt:
        status === "PUBLISHED"
          ? (existing.publishedAt ?? new Date())
          : existing.publishedAt,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
    },
  });

  if (imageUrl) {
    const firstImage = await prisma.productImage.findFirst({
      where: { productId: existing.id },
      orderBy: { sortOrder: "asc" },
    });
    if (firstImage) {
      await prisma.productImage.update({
        where: { id: firstImage.id },
        data: { url: imageUrl },
      });
    } else {
      await prisma.productImage.create({
        data: {
          productId: existing.id,
          url: imageUrl,
          sortOrder: 0,
        },
      });
    }
  }

  await writeAuditLog({
    actorId: user.id,
    action: "product.updated",
    entityType: "Product",
    entityId: existing.id,
  });

  revalidatePath("/admin/vendors/products");
  revalidatePath(`/admin/vendors/products/${existing.id}/edit`);
  revalidatePath("/vendor/products");
  revalidatePath(`/vendor/products/${existing.id}/edit`);
  revalidatePath("/shop");
  revalidatePath(`/products/${existing.slug}`);
  return { ok: true, message: "Product saved." };
}

export async function advanceVendorOrderAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || ((user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") && user.role !== "VENDOR")) {
    return { ok: false, error: "Vendor access required." };
  }

  const vendorOrderId = String(formData.get("vendorOrderId") || "");
  const status = String(formData.get("status") || "") as VendorOrderStatus;
  const trackingNumber =
    String(formData.get("trackingNumber") || "").trim() || undefined;
  if (!vendorOrderId || !status) {
    return { ok: false, error: "Invalid fulfillment update." };
  }

  const result = await advanceVendorOrderStatus({
    vendorOrderId,
    user,
    status,
    trackingNumber,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/admin/vendors/orders");
  revalidatePath("/vendor/orders");
  revalidatePath("/admin/orders");
  revalidatePath(`/account/orders/${result.order.orderNumber}`);
  revalidatePath(`/order-confirmation/${result.order.orderNumber}`);
  return {
    ok: true,
    message: `Order updated to ${status.toLowerCase()}.`,
  };
}
