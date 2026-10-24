import type { VendorOrderStatus } from "@/lib/types";

export type VendorOrderTab =
  | "all"
  | "new"
  | "accepted"
  | "packaged"
  | "shipped";

export const VENDOR_ORDER_TABS: {
  key: VendorOrderTab;
  label: string;
}[] = [
  { key: "all", label: "All Orders" },
  { key: "new", label: "New Orders" },
  { key: "accepted", label: "Accepted" },
  { key: "packaged", label: "Packaged" },
  { key: "shipped", label: "Shipped/Delivered" },
];

export const VENDOR_ORDER_TAB_STATUSES: Record<
  VendorOrderTab,
  string[] | null
> = {
  all: null,
  new: ["PAID"],
  accepted: ["ACCEPTED", "PROCESSING"],
  packaged: ["PACKAGED"],
  shipped: ["SHIPPED", "DELIVERED"],
};

const ADVANCE: Record<string, { next: VendorOrderStatus; label: string }> = {
  PAID: { next: "ACCEPTED", label: "Accept order" },
  ACCEPTED: { next: "PACKAGED", label: "Mark packaged" },
  PROCESSING: { next: "PACKAGED", label: "Mark packaged" },
  PACKAGED: { next: "SHIPPED", label: "Mark shipped" },
  SHIPPED: { next: "DELIVERED", label: "Mark delivered" },
};

export function nextVendorOrderAction(status: string) {
  return ADVANCE[status] ?? null;
}

export function vendorOrderTabLabel(status: string): string {
  switch (status) {
    case "PAID":
      return "New";
    case "ACCEPTED":
    case "PROCESSING":
      return "Accepted";
    case "PACKAGED":
      return "Packaged";
    case "SHIPPED":
      return "Shipped";
    case "DELIVERED":
      return "Delivered";
    case "PENDING_PAYMENT":
      return "Awaiting payment";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

export function parseVendorOrderTab(raw: string | undefined): VendorOrderTab {
  const key = (raw || "all").toLowerCase();
  if (
    key === "new" ||
    key === "accepted" ||
    key === "packaged" ||
    key === "shipped"
  ) {
    return key;
  }
  return "all";
}

export function vendorOrderBadgeTone(
  status: string,
): "info" | "accent" | "success" | "warning" | "danger" {
  switch (status) {
    case "PAID":
      return "warning";
    case "ACCEPTED":
    case "PROCESSING":
      return "info";
    case "PACKAGED":
      return "accent";
    case "SHIPPED":
    case "DELIVERED":
      return "success";
    case "CANCELLED":
      return "danger";
    default:
      return "info";
  }
}
