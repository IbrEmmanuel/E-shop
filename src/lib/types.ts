/** App-level enums stored as strings in SQLite. */

export type Role = "CUSTOMER" | "VENDOR" | "ADMIN" | "SUPER_ADMIN";

export type VendorApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED";

export type VendorStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED";

export type ProductStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

/** Vendor-side fulfillment pipeline (stored on VendorOrder.status). */
export type VendorOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "ACCEPTED"
  | "PACKAGED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "PROCESSING"; // legacy alias → treat as ACCEPTED

export type PaymentStatus =
  | "PENDING"
  | "REQUIRES_ACTION"
  | "SUCCEEDED"
  | "FAILED"
  | "REFUNDED";

export type ImportBatchStatus =
  | "UPLOADED"
  | "VALIDATING"
  | "READY"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "COMPLETED_WITH_ERRORS"
  | "FAILED"
  | "CANCELLED";

export type ImportMode = "CREATE_ONLY" | "UPDATE_BY_SKU" | "UPSERT";

export type BlogPostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type RentalStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED";

export type RentalPaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "REFUNDED";
