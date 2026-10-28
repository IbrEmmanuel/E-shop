import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import {
  requireAdmin,
  requireAuth,
  type SessionUser,
} from "@/lib/permissions";

const draftSchema = z.object({
  wizardStep: z.coerce.number().int().min(1).max(6).optional(),
  storeName: z.string().trim().max(120).optional(),
  businessName: z.string().trim().max(200).optional().nullable(),
  businessType: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  website: z.string().trim().max(300).optional().nullable().or(z.literal("")),
  businessAddress: z.string().trim().max(300).optional().nullable(),
  businessCity: z.string().trim().max(120).optional().nullable(),
  businessState: z.string().trim().max(120).optional().nullable(),
  businessCountry: z.string().trim().max(2).optional(),
  logoUrl: z.string().trim().max(2_000_000).optional().nullable(),
  bannerUrl: z.string().trim().max(2_000_000).optional().nullable(),
  categoryIdsJson: z.string().optional(),
  shippingPolicy: z.string().trim().max(4000).optional().nullable(),
  returnsPolicy: z.string().trim().max(4000).optional().nullable(),
  processingDays: z.coerce.number().int().min(0).max(60).optional().nullable(),
  taxId: z.string().trim().max(80).optional().nullable(),
  payoutBankName: z.string().trim().max(120).optional().nullable(),
  payoutAccountName: z.string().trim().max(120).optional().nullable(),
  payoutAccountNumber: z.string().trim().max(40).optional().nullable(),
  rentalPlanId: z.string().optional().nullable(),
});

export type VendorApplicationDraftInput = z.input<typeof draftSchema>;

const EDITABLE = ["DRAFT", "CHANGES_REQUESTED", "REJECTED"] as const;

export async function getOpenApplication(userId: string) {
  return prisma.vendorApplication.findFirst({
    where: {
      userId,
      status: {
        in: [
          "DRAFT",
          "SUBMITTED",
          "UNDER_REVIEW",
          "CHANGES_REQUESTED",
          "REJECTED",
        ],
      },
    },
    include: { documents: { orderBy: { createdAt: "desc" } }, rentalPlan: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function ensureDraftApplication(user: SessionUser) {
  const u = requireAuth(user);
  const existing = await getOpenApplication(u.id);
  if (existing) return existing;

  return prisma.vendorApplication.create({
    data: {
      userId: u.id,
      status: "DRAFT",
      storeName: "",
      contactEmail: u.email,
      wizardStep: 1,
    },
    include: { documents: true, rentalPlan: true },
  });
}

export async function saveApplicationDraft(
  user: SessionUser | null | undefined,
  raw: VendorApplicationDraftInput,
) {
  const u = requireAuth(user);
  const input = draftSchema.parse(raw);
  let app = await getOpenApplication(u.id);
  if (!app) {
    app = await ensureDraftApplication(u);
  }
  if (!EDITABLE.includes(app.status as (typeof EDITABLE)[number])) {
    throw new Error("This application can no longer be edited.");
  }

  const nextStatus =
    app.status === "REJECTED" || app.status === "CHANGES_REQUESTED"
      ? "DRAFT"
      : app.status;

  return prisma.vendorApplication.update({
    where: { id: app.id },
    data: {
      status: nextStatus,
      wizardStep: input.wizardStep ?? app.wizardStep,
      storeName: input.storeName ?? app.storeName,
      businessName:
        input.businessName === undefined
          ? app.businessName
          : input.businessName || null,
      businessType:
        input.businessType === undefined
          ? app.businessType
          : input.businessType || null,
      description:
        input.description === undefined
          ? app.description
          : input.description || null,
      contactEmail: input.contactEmail
        ? input.contactEmail.toLowerCase()
        : app.contactEmail || u.email,
      contactPhone:
        input.contactPhone === undefined
          ? app.contactPhone
          : input.contactPhone || null,
      website:
        input.website === undefined ? app.website : input.website || null,
      businessAddress:
        input.businessAddress === undefined
          ? app.businessAddress
          : input.businessAddress || null,
      businessCity:
        input.businessCity === undefined
          ? app.businessCity
          : input.businessCity || null,
      businessState:
        input.businessState === undefined
          ? app.businessState
          : input.businessState || null,
      businessCountry: input.businessCountry ?? app.businessCountry,
      logoUrl:
        input.logoUrl === undefined ? app.logoUrl : input.logoUrl || null,
      bannerUrl:
        input.bannerUrl === undefined ? app.bannerUrl : input.bannerUrl || null,
      categoryIdsJson: input.categoryIdsJson ?? app.categoryIdsJson,
      shippingPolicy:
        input.shippingPolicy === undefined
          ? app.shippingPolicy
          : input.shippingPolicy || null,
      returnsPolicy:
        input.returnsPolicy === undefined
          ? app.returnsPolicy
          : input.returnsPolicy || null,
      processingDays:
        input.processingDays === undefined
          ? app.processingDays
          : input.processingDays,
      taxId: input.taxId === undefined ? app.taxId : input.taxId || null,
      payoutBankName:
        input.payoutBankName === undefined
          ? app.payoutBankName
          : input.payoutBankName || null,
      payoutAccountName:
        input.payoutAccountName === undefined
          ? app.payoutAccountName
          : input.payoutAccountName || null,
      payoutAccountNumber:
        input.payoutAccountNumber === undefined
          ? app.payoutAccountNumber
          : input.payoutAccountNumber || null,
      rentalPlanId:
        input.rentalPlanId === undefined
          ? app.rentalPlanId
          : input.rentalPlanId || null,
      reviewNotes:
        nextStatus === "DRAFT" && app.status !== "DRAFT"
          ? app.reviewNotes
          : app.reviewNotes,
    },
    include: { documents: true, rentalPlan: true },
  });
}

export async function addApplicationDocument(
  user: SessionUser | null | undefined,
  opts: {
    docType: string;
    fileUrl: string;
    fileName?: string;
    mimeType?: string;
    label?: string;
  },
) {
  const u = requireAuth(user);
  const app = await getOpenApplication(u.id);
  if (!app || !EDITABLE.includes(app.status as (typeof EDITABLE)[number])) {
    throw new Error("No editable application found.");
  }
  return prisma.vendorApplicationDocument.create({
    data: {
      applicationId: app.id,
      docType: opts.docType,
      fileUrl: opts.fileUrl,
      fileName: opts.fileName ?? null,
      mimeType: opts.mimeType ?? null,
      label: opts.label ?? null,
    },
  });
}

export async function submitVendorApplication(
  user: SessionUser | null | undefined,
) {
  const u = requireAuth(user);
  const dbUser = await prisma.user.findUnique({ where: { id: u.id } });
  if (!dbUser?.emailVerified) {
    throw new Error("Verify your email before submitting the application.");
  }

  const app = await getOpenApplication(u.id);
  if (!app) throw new Error("Start your application first.");
  if (!EDITABLE.includes(app.status as (typeof EDITABLE)[number]) && app.status !== "DRAFT") {
    if (app.status === "SUBMITTED" || app.status === "UNDER_REVIEW") {
      throw new Error("Application is already awaiting review.");
    }
  }

  if (!app.storeName?.trim() || app.storeName.trim().length < 2) {
    throw new Error("Store name is required.");
  }
  if (!app.businessName?.trim()) throw new Error("Business name is required.");
  if (!app.businessType?.trim()) throw new Error("Business type is required.");
  if (!app.businessAddress?.trim() || !app.businessCity?.trim()) {
    throw new Error("Business address and city are required.");
  }
  if (!app.contactEmail?.trim()) throw new Error("Contact email is required.");
  if (!app.contactPhone?.trim()) throw new Error("Contact phone is required.");
  if (!app.rentalPlanId) throw new Error("Select a rental plan.");
  if (!app.payoutAccountNumber?.trim() || !app.payoutBankName?.trim()) {
    throw new Error("Payout bank details are required.");
  }

  const docs = await prisma.vendorApplicationDocument.count({
    where: { applicationId: app.id },
  });
  if (docs < 1) {
    throw new Error("Upload at least one verification document (ID or business reg).");
  }

  const plan = await prisma.shopRentalPlan.findFirst({
    where: { id: app.rentalPlanId, isActive: true },
  });
  if (!plan) throw new Error("Selected rental plan is not available.");

  const updated = await prisma.vendorApplication.update({
    where: { id: app.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      wizardStep: 6,
    },
  });

  await writeAuditLog({
    actorId: u.id,
    action: "vendor.application.submitted",
    entityType: "VendorApplication",
    entityId: updated.id,
  });

  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      status: "ACTIVE",
    },
    select: { email: true },
    take: 10,
  });
  await Promise.allSettled(
    admins.map((a) =>
      sendEmail({
        to: a.email,
        subject: `Seller application: ${updated.storeName}`,
        html: `<p>New application from ${updated.contactEmail}.</p><p><a href="${siteUrl("/admin/vendors")}">Review</a></p>`,
        text: `New seller application ${updated.storeName}`,
      }),
    ),
  );

  return updated;
}

export async function adminRequestApplicationChanges(
  user: SessionUser | null | undefined,
  applicationId: string,
  reviewNotes: string,
) {
  const admin = requireAdmin(user);
  if (!reviewNotes.trim()) {
    throw new Error("Explain what the seller must fix.");
  }
  const app = await prisma.vendorApplication.findUnique({
    where: { id: applicationId },
  });
  if (!app) throw new Error("Application not found");
  if (app.status === "APPROVED") throw new Error("Already approved");

  const updated = await prisma.vendorApplication.update({
    where: { id: applicationId },
    data: {
      status: "CHANGES_REQUESTED",
      reviewNotes: reviewNotes.trim(),
      reviewedAt: new Date(),
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "vendor.application.changes_requested",
    entityType: "VendorApplication",
    entityId: applicationId,
  });

  await sendEmail({
    to: app.contactEmail,
    subject: "Seller application needs more information",
    html: `<p>Please update your application:</p><p>${reviewNotes.trim()}</p><p><a href="${siteUrl("/vendor/apply")}">Continue application</a></p>`,
    text: `Update your application: ${reviewNotes.trim()}`,
  });

  return updated;
}
