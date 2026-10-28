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
  if (user.role === "SUPER_ADMIN") {
    redirect("/super");
  }
  if (user.role === "ADMIN") {
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
