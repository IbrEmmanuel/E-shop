import { prisma } from "@/lib/db";
import { requireAdmin, type SessionUser } from "@/lib/permissions";

export type AdminDashboardMetrics = {
  users: {
    total: number;
    customers: number;
    vendors: number;
    admins: number;
  };
  vendors: {
    active: number;
    pending: number;
    suspended: number;
    applicationsOpen: number;
  };
  products: {
    total: number;
    published: number;
    pendingReview: number;
  };
  orders: {
    total: number;
    pendingPayment: number;
    paid: number;
    revenueMinor: number;
  };
  rentals: {
    trial: number;
    active: number;
    pastDue: number;
  };
  imports: {
    processing: number;
    completedLast7d: number;
  };
  blog: {
    published: number;
    drafts: number;
  };
};

/**
 * Admin dashboard metrics — all counts/sums from the database.
 * Requires ADMIN role.
 */
export async function getDashboardMetrics(
  user: SessionUser | null | undefined,
): Promise<AdminDashboardMetrics> {
  requireAdmin(user);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    usersTotal,
    customers,
    vendorsRole,
    admins,
    vendorsActive,
    vendorsPending,
    vendorsSuspended,
    applicationsOpen,
    productsTotal,
    productsPublished,
    productsPending,
    ordersTotal,
    ordersPendingPayment,
    ordersPaid,
    paidOrders,
    rentalsTrial,
    rentalsActive,
    rentalsPastDue,
    importsProcessing,
    importsCompleted,
    blogPublished,
    blogDrafts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "VENDOR" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.vendor.count({ where: { status: "ACTIVE" } }),
    prisma.vendor.count({ where: { status: "PENDING" } }),
    prisma.vendor.count({ where: { status: "SUSPENDED" } }),
    prisma.vendorApplication.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] } },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { status: "PUBLISHED" } }),
    prisma.product.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.count({
      where: {
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
      _sum: { totalMinor: true },
    }),
    prisma.vendorRental.count({ where: { status: "TRIAL" } }),
    prisma.vendorRental.count({ where: { status: "ACTIVE" } }),
    prisma.vendorRental.count({ where: { status: "PAST_DUE" } }),
    prisma.importBatch.count({
      where: { status: { in: ["QUEUED", "PROCESSING"] } },
    }),
    prisma.importBatch.count({
      where: {
        status: { in: ["COMPLETED", "COMPLETED_WITH_ERRORS"] },
        completedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
    prisma.blogPost.count({ where: { status: "DRAFT" } }),
  ]);

  const revenueMinor = paidOrders._sum.totalMinor ?? 0;

  return {
    users: {
      total: usersTotal,
      customers,
      vendors: vendorsRole,
      admins,
    },
    vendors: {
      active: vendorsActive,
      pending: vendorsPending,
      suspended: vendorsSuspended,
      applicationsOpen,
    },
    products: {
      total: productsTotal,
      published: productsPublished,
      pendingReview: productsPending,
    },
    orders: {
      total: ordersTotal,
      pendingPayment: ordersPendingPayment,
      paid: ordersPaid,
      revenueMinor,
    },
    rentals: {
      trial: rentalsTrial,
      active: rentalsActive,
      pastDue: rentalsPastDue,
    },
    imports: {
      processing: importsProcessing,
      completedLast7d: importsCompleted,
    },
    blog: {
      published: blogPublished,
      drafts: blogDrafts,
    },
  };
}

/** Lean metrics for the admin home — only fields the dashboard tiles use. */
export async function getAdminHomeMetrics(user: SessionUser | null | undefined) {
  requireAdmin(user);

  const paidStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

  const [
    revenue,
    paid,
    productsPublished,
    vendorsActive,
    productsPending,
    applicationsOpen,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: paidStatuses } },
      _sum: { totalMinor: true },
    }),
    prisma.order.count({ where: { status: { in: paidStatuses } } }),
    prisma.product.count({ where: { status: "PUBLISHED" } }),
    prisma.vendor.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.vendorApplication.count({
      where: {
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] },
      },
    }),
  ]);

  return {
    orders: {
      paid,
      revenueMinor: revenue._sum?.totalMinor ?? 0,
    },
    products: {
      published: productsPublished,
      pendingReview: productsPending,
    },
    vendors: {
      active: vendorsActive,
      applicationsOpen,
    },
  };
}
