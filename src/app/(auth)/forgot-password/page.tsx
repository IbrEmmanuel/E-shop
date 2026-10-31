import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Forgot password",
  path: "/forgot-password",
  noIndex: true,
});

export default async function ForgotPasswordPage() {
  return (
    <div className="auth-card home-reveal">
      <div className="auth-card__glow" aria-hidden />
      <div className="auth-card__inner">
        <BrandLogo size="lg" className="auth-stage__brand-mark" />
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
