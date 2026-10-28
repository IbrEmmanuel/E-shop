import Link from "next/link";
import { AuthParticleOrb } from "@/components/auth/auth-particle-orb";
import { LoginForm } from "@/components/forms/auth-forms";
import { buildMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/services/settings";

export const metadata = buildMetadata({
  title: "Sign in",
  path: "/login",
  noIndex: true,
});

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const callbackUrl =
    typeof sp.callbackUrl === "string" ? sp.callbackUrl : "/account";
  const forCheckout = callbackUrl.startsWith("/checkout");
  const settings = await getSiteSettings();

  return (
    <section className="auth-cinematic">
      <div className="auth-cinematic__hero">
        <AuthParticleOrb label={settings.siteName} />
        <div className="auth-cinematic__copy home-reveal">
          <p className="auth-cinematic__eyebrow">Marketplace · Sign in</p>
          <h1 className="auth-cinematic__headline">
            {forCheckout ? (
              <>
                Sign in
                <br />
                to place your order.
              </>
            ) : (
              <>
                Curated shops.
                <br />
                One marketplace.
              </>
            )}
          </h1>
          <p className="auth-cinematic__sub">
            {forCheckout
              ? "Use your email and password. After login you will return to checkout."
              : "Track orders, checkout faster, and pick up where you left off."}
          </p>
        </div>
      </div>

      <div className="auth-card auth-card--cinematic home-reveal home-reveal--2">
        <div className="auth-card__glow" aria-hidden />
        <div className="auth-card__inner">
          <Link href="/" className="auth-stage__brand auth-stage__brand--sm">
            {settings.siteName}
          </Link>
          <h2 className="auth-stage__title">
            {forCheckout ? "Sign in to continue" : "Welcome back"}
          </h2>
          <p className="auth-stage__lede">
            {forCheckout
              ? "Orders require an account. Sign in with your email, then complete payment."
              : "Sign in with your email to continue shopping and managing orders."}
          </p>

          <div className="auth-stage__form">
            <LoginForm callbackUrl={callbackUrl} />
          </div>

          <p className="auth-stage__foot">
            <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
              Create an account
            </Link>
            {" · "}
            <Link href="/forgot-password">Forgot password?</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
