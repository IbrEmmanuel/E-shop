import { z } from "zod";
import type { Prisma, Vendor, VendorApplication } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import {
  PermissionError,
  requireAdmin,
  requireAuth,
  type SessionUser,
} from "@/lib/permissions";
import { slugify, uniqueSlug } from "@/lib/slug";
import { sendEmail } from "@/lib/email";

const applySchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  businessName: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  contactEmail: z.string().email(),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  rentalPlanId: z.string().min(1),
});

export type ApplyAsVendorInput = z.input<typeof applySchema>;

export async function applyAsVendor(
  user: SessionUser | null | undefined,
  raw: ApplyAsVendorInput,
): Promise<VendorApplication> {
  const u = requireAuth(user);
  const input = applySchema.parse(raw);

  const plan = await prisma.shopRentalPlan.findFirst({
    where: { id: input.rentalPlanId, isActive: true },
  });
  if (!plan) throw new Error("Selected rental plan is not available");

  const existingVendor = await prisma.vendor.findUnique({
    where: { userId: u.id },
  });
  if (existingVendor) {
    throw new Error("You already have a vendor account");
  }

  const pending = await prisma.vendorApplication.findFirst({
    where: {
      userId: u.id,
      status: { in: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] },
    },
  });
  if (pending) {
    throw new Error("You already have an open vendor application");
  }

  const app = await prisma.vendorApplication.create({
    data: {
      userId: u.id,
      storeName: input.storeName,
      businessName: input.businessName ?? null,
      description: input.description ?? null,
      contactEmail: input.contactEmail.toLowerCase(),
      contactPhone: input.contactPhone ?? null,
      website: input.website || null,
      rentalPlanId: input.rentalPlanId,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  await writeAuditLog({
    actorId: u.id,
    action: "vendor.application.submitted",
    entityType: "VendorApplication",
    entityId: app.id,
    meta: { rentalPlanId: input.rentalPlanId },
  });

  return app;
}

/**
 * Admin approves application: creates Vendor + VendorRental trial from plan.
 */
export async function adminApproveApplication(
  user: SessionUser | null | undefined,
  applicationId: string,
  opts?: { reviewNotes?: string; commissionBps?: number },
): Promise<Vendor> {
  const admin = requireAdmin(user);

  const application = await prisma.vendorApplication.findUnique({
    where: { id: applicationId },
    include: { rentalPlan: true },
  });
  if (!application) throw new Error("Application not found");
  if (application.status === "APPROVED") {
    throw new Error("Application already approved");
  }
  if (!application.rentalPlanId || !application.rentalPlan) {
    throw new Error("Application has no rental plan");
  }

  const existingVendor = await prisma.vendor.findUnique({
    where: { userId: application.userId },
  });
  if (existingVendor) {
    throw new Error("User already has a vendor account");
  }

  const plan = application.rentalPlan;
  const baseSlug = slugify(application.storeName) || "store";
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.vendor.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = uniqueSlug(baseSlug, attempt);
  }

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + plan.trialDays);

  const vendor = await prisma.$transaction(async (tx) => {
    const created = await tx.vendor.create({
      data: {
        userId: application.userId,
        slug,
        storeName: application.storeName,
        description: application.description,
        contactEmail: application.contactEmail,
        contactPhone: application.contactPhone,
        businessName: application.businessName,
        status: "ACTIVE",
        commissionBps: opts?.commissionBps ?? 1000,
      },
    });

    await tx.vendorRental.create({
      data: {
        vendorId: created.id,
        planId: plan.id,
        status: "TRIAL",
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        nextPaymentDue: trialEnd,
      },
    });

    await tx.vendorApplication.update({
      where: { id: application.id },
      data: {
        status: "APPROVED",
        vendorId: created.id,
        reviewedAt: now,
        reviewNotes: opts?.reviewNotes ?? null,
      },
    });

    await tx.user.update({
      where: { id: application.userId },
      data: { role: "VENDOR" },
    });

    return created;
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "vendor.application.approved",
    entityType: "Vendor",
    entityId: vendor.id,
    meta: { applicationId, planId: plan.id },
  });

  await sendEmail({
    to: application.contactEmail,
    subject: "Your E-Shop vendor application was approved",
    html: `<p>Your store <strong>${vendor.storeName}</strong> is now active. Trial ends ${trialEnd.toISOString()}.</p>`,
    text: `Your store ${vendor.storeName} is now active. Trial ends ${trialEnd.toISOString()}.`,
  });

  return vendor;
}

export async function getVendorByUserId(
  userId: string,
): Promise<Vendor | null> {
  return prisma.vendor.findUnique({ where: { userId } });
}

export async function getVendorBySlug(slug: string) {
  return prisma.vendor.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      rental: { include: { plan: true } },
    },
  });
}

/**
 * Ensure the session user owns the vendor (or is admin).
 */
export async function requireOwnedVendor(
  user: SessionUser | null | undefined,
  vendorId?: string,
): Promise<Vendor> {
  const u = requireAuth(user);
  if (u.role === "ADMIN" && vendorId) {
    const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!v) throw new PermissionError("Vendor not found");
    return v;
  }
  const vendor = await prisma.vendor.findUnique({ where: { userId: u.id } });
  if (!vendor) throw new PermissionError("Vendor account required");
  if (vendorId && vendor.id !== vendorId) {
    throw new PermissionError("Cannot access another vendor");
  }
  return vendor;
}

export type VendorMetrics = {
  productCount: number;
  publishedCount: number;
  orderCount: number;
  revenueMinor: number;
  pendingOrderCount: number;
};

export async function getVendorMetrics(
  user: SessionUser | null | undefined,
  vendorId?: string,
): Promise<VendorMetrics> {
  const vendor = await requireOwnedVendor(user, vendorId);

  const [
    productCount,
    publishedCount,
    vendorOrders,
    pendingOrderCount,
  ] = await Promise.all([
    prisma.product.count({ where: { vendorId: vendor.id } }),
    prisma.product.count({
      where: { vendorId: vendor.id, status: "PUBLISHED" },
    }),
    prisma.vendorOrder.findMany({
      where: {
        vendorId: vendor.id,
        status: {
          in: [
            "PAID",
            "ACCEPTED",
            "PROCESSING",
            "PACKAGED",
            "SHIPPED",
            "DELIVERED",
          ],
        },
      },
      select: { totalMinor: true },
    }),
    prisma.vendorOrder.count({
      where: {
        vendorId: vendor.id,
        status: { in: ["PAID", "ACCEPTED", "PROCESSING", "PACKAGED"] },
      },
    }),
  ]);

  const revenueMinor = vendorOrders.reduce((s, o) => s + o.totalMinor, 0);

  return {
    productCount,
    publishedCount,
    orderCount: vendorOrders.length,
    revenueMinor,
    pendingOrderCount,
  };
}

export async function listVendorProducts(
  user: SessionUser | null | undefined,
  opts?: { status?: string; page?: number; pageSize?: number },
) {
  const vendor = await requireOwnedVendor(user);
  const page = opts?.page ?? 1;
  const pageSize = Math.min(opts?.pageSize ?? 20, 100);
  const where: Prisma.ProductWhereInput = { vendorId: vendor.id };
  if (opts?.status) {
    where.status = opts.status as Prisma.ProductWhereInput["status"];
  }

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  return { items, total, page, pageSize };
}
