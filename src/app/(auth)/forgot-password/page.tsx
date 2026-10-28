import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { buildMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/services/settings";

export const metadata = buildMetadata({
  title: "Forgot password",
  path: "/forgot-password",
  noIndex: true,
});

export default async function ForgotPasswordPage() {
  const settings = await getSiteSettings();

  return (
    <div className="auth-card home-reveal">
      <div className="auth-card__glow" aria-hidden />
      <div className="auth-card__inner">
        <Link href="/" className="auth-stage__brand">
          {settings.siteName}
        </Link>
        <h1 className="auth-stage__title">Reset password</h1>
        <p className="auth-stage__lede">
          Enter the email on your account. We will send a one-hour reset link.
        </p>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          <Link href="/login" className="font-semibold underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
