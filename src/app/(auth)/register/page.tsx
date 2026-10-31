import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { RegisterForm } from "@/components/forms/auth-forms";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Create account",
  path: "/register",
  noIndex: true,
});

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const referralCode = typeof sp.ref === "string" ? sp.ref : undefined;
  const callbackUrl =
    typeof sp.callbackUrl === "string" ? sp.callbackUrl : "/";
  const forCheckout = callbackUrl.startsWith("/checkout");

  return (
    <div className="auth-card home-reveal">
      <div className="auth-card__glow" aria-hidden />
      <div className="auth-card__inner">
        <BrandLogo size="lg" className="auth-stage__brand-mark" />
        <h1 className="auth-stage__title">Create account</h1>
        <p className="auth-stage__lede">
          {forCheckout
            ? "Create an account with your email to place your order and track delivery."
            : "Join the marketplace to shop, track deliveries, and follow vendors you trust."}
        </p>
        {referralCode ? (
          <p className="auth-stage__ref">
            Referral applied: <strong>{referralCode}</strong>
          </p>
        ) : null}

        <div className="auth-stage__form">
          <RegisterForm
            referralCode={referralCode}
            callbackUrl={callbackUrl}
          />
        </div>

        <p className="auth-stage__foot">
          Already have an account?{" "}
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
