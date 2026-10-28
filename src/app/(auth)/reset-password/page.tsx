import Link from "next/link";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/services/settings";

export const metadata = buildMetadata({
  title: "Choose new password",
  path: "/reset-password",
  noIndex: true,
});

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string; email?: string }>;
}) {
  const settings = await getSiteSettings();
  const sp = (await searchParams) ?? {};
  const token = typeof sp.token === "string" ? sp.token : "";
  const email = typeof sp.email === "string" ? sp.email : "";

  return (
    <div className="auth-card home-reveal">
      <div className="auth-card__glow" aria-hidden />
      <div className="auth-card__inner">
        <Link href="/" className="auth-stage__brand">
          {settings.siteName}
        </Link>
        <h1 className="auth-stage__title">Choose a new password</h1>
        {!token || !email ? (
          <Alert tone="danger" className="mt-4">
            This reset link is incomplete. Request a new one from{" "}
            <Link href="/forgot-password" className="underline">
              forgot password
            </Link>
            .
          </Alert>
        ) : (
          <ResetPasswordForm email={email} token={token} />
        )}
      </div>
    </div>
  );
}
