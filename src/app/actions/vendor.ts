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
import { applyAsVendor, requireOwnedVendor } from "@/services/vendors";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function submitApplicationAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  try {
    await applyAsVendor(user, {
      storeName: String(formData.get("storeName") ?? ""),
      businessName: String(formData.get("businessName") || "") || null,
      description: String(formData.get("description") || "") || null,
      contactEmail: String(formData.get("contactEmail") ?? ""),
      contactPhone: String(formData.get("contactPhone") || "") || null,
      website: String(formData.get("website") || "") || null,
      rentalPlanId: String(formData.get("rentalPlanId") ?? ""),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Application failed" };
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
  status: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  imageUrl: z.string().trim().optional().nullable(),
  seoTitle: z.string().trim().optional().nullable(),
  seoDescription: z.string().trim().optional().nullable(),
});

export async function createProductAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return { ok: false, error: "Admin access required." };
  }

  const vendorId = String(formData.get("vendorId") || "").trim();
  if (!vendorId) {
    return { ok: false, error: "Select a vendor shop." };
  }

  let vendor;
  try {
    vendor = await requireOwnedVendor(user, vendorId);
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
    return { ok: false, error: "Invalid price format." };
  }

  let status = parsed.data.status;
  if (status === "PUBLISHED") {
    const gate = await checkRentalAllowsPublishing(vendor.id);
    if (!gate.allowed) {
      status = "PENDING_REVIEW";
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
        images: parsed.data.imageUrl
          ? { create: [{ url: parsed.data.imageUrl, sortOrder: 0 }] }
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
  redirect("/admin/vendors/products");
}

export async function updateProductAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return { ok: false, error: "Admin access required." };
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
    return { ok: false, error: "Invalid price format." };
  }

  const status = parsed.data.status;
  if (status === "PUBLISHED" && user.role !== "ADMIN") {
    const gate = await checkRentalAllowsPublishing(vendor.id);
    if (!gate.allowed) {
      return { ok: false, error: gate.reason || "Rental does not allow publishing" };
    }
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
      publishedAt:
        status === "PUBLISHED"
          ? (existing.publishedAt ?? new Date())
          : existing.publishedAt,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
    },
  });

  const imageUrl = parsed.data.imageUrl?.trim();
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
  revalidatePath("/shop");
  revalidatePath(`/products/${existing.slug}`);
  return { ok: true, message: "Product saved." };
}

export async function advanceVendorOrderAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return { ok: false, error: "Admin access required." };
  }

  const vendorOrderId = String(formData.get("vendorOrderId") || "");
  const status = String(formData.get("status") || "") as VendorOrderStatus;
  if (!vendorOrderId || !status) {
    return { ok: false, error: "Invalid fulfillment update." };
  }

  const result = await advanceVendorOrderStatus({
    vendorOrderId,
    user,
    status,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/admin/vendors/orders");
  revalidatePath("/admin/orders");
  revalidatePath(`/account/orders/${result.order.orderNumber}`);
  revalidatePath(`/order-confirmation/${result.order.orderNumber}`);
  return {
    ok: true,
    message: `Order updated to ${status.toLowerCase()}.`,
  };
}
