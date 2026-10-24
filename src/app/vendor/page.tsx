import { redirect } from "next/navigation";

/** Vendor desk removed — sellers apply via /sell; ops live under /admin/vendors. */
export default function VendorIndexPage() {
  redirect("/sell");
}
