import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { getSessionUser } from "@/lib/auth";
import "./account.css";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?callbackUrl=/account");
  }

  const pathname = (await headers()).get("x-pathname") || "";
  const staffInspectingOrder =
    pathname === "/account/orders" ||
    pathname.startsWith("/account/orders/");

  // Staff normally land on /admin or /super, but may open customer track URLs.
  if (user.role === "SUPER_ADMIN" && !staffInspectingOrder) {
    redirect("/super");
  }
  if (user.role === "ADMIN" && !staffInspectingOrder) {
    redirect("/admin");
  }

  const name = user.name?.trim() || user.email.split("@")[0] || "Shopper";

  return (
    <div className="container-page py-8 md:py-12">
      <AccountShell name={name} email={user.email}>
        {children}
      </AccountShell>
    </div>
  );
}
