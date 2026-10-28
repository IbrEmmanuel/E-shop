import Link from "next/link";
import { ConfirmEmailForm } from "@/components/forms/confirm-email-form";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/services/settings";

export const metadata = buildMetadata({
  title: "Verify email",
  path: "/verify-email",
  noIndex: true,
});

export default async function VerifyEmailPage({
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
        <h1 className="auth-stage__title">Verify email</h1>
        {!token || !email ? (
          <Alert tone="danger" className="mt-4">
            This link is incomplete. Open the link from your email, or request a
            new one from{" "}
            <Link href="/vendor/apply" className="underline">
              seller application
            </Link>
            .
          </Alert>
        ) : (
          <ConfirmEmailForm email={email} token={token} />
        )}
      </div>
    </div>
  );
}
