import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildMetadata } from "@/lib/seo";
import { emailConfigured } from "@/lib/env";
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
          Enter the email on your account and we will send a reset link when
          email delivery is configured.
        </p>

        <Alert tone="info" className="auth-stage__alert">
          {emailConfigured()
            ? "Email appears configured — full reset tokens are not wired in this build yet; contact an admin."
            : "Add EMAIL_API_KEY to enable reset emails. Until then, ask an admin to update your password."}
        </Alert>

        <form
          className="auth-form auth-stage__form space-y-5"
          action="#"
          method="post"
        >
          <div>
            <Label htmlFor="email">Account email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>
          <div className="button-group button-group--stack-mobile auth-form__actions">
            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="auth-form__submit"
              disabled
            >
              Send reset link
            </Button>
            <Button asChild href="/login" variant="outline" size="lg">
              Sign in
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
