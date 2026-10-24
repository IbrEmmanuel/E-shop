import Link from "next/link";
import { saveAudienceConsentAction } from "@/app/actions/advertising";
import { SectionHeader } from "@/components/dashboard/section-header";
import {
  AddAddressForm,
  ChangePasswordForm,
  PreferencesForm,
  ProfileDetailsForm,
} from "@/components/forms/profile-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { initials } from "@/lib/greeting";
import { siteUrl } from "@/lib/env";
import { prisma } from "@/lib/db";
import { ensureUserWorkspace } from "@/services/workspace";
import { redirect } from "next/navigation";

export default async function AdminProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?callbackUrl=/admin/profile");
  const user = await ensureUserWorkspace(session);
  const consent = await prisma.audienceConsent.findUnique({
    where: { userId: user.id },
  });

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.name ||
    "User";
  const code = user.referralCode || "ESHOP-USER";
  const referralLink = siteUrl(`/register?ref=${code}`);
  const mark = initials(displayName, user.email);

  return (
    <div className="space-y-8">
      <SectionHeader
        showGreeting
        userName={displayName}
        title="Profile"
        description="Personal details, referrals, and preferences."
      />

      <section className="card flex flex-wrap items-center gap-4 p-6 shadow-[var(--shadow-sm)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-lg font-bold text-[var(--color-primary-foreground)]">
          {mark}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold uppercase tracking-wide">
            {displayName}
          </p>
          <p className="truncate text-sm text-[var(--color-text-muted)]">
            {user.email}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="success">Member</Badge>
            <span className="text-xs text-[var(--color-text-muted)]">
              Member since {user.createdAt.getFullYear()}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileDetailsForm
          firstName={user.firstName}
          lastName={user.lastName}
          phone={user.customerProfile?.phone}
        />

        <section className="card space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Saved Addresses</h2>
          </div>
          {user.addresses.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No addresses saved yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {user.addresses.map((a) => (
                <li
                  key={a.id}
                  className="rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] px-3 py-3 text-sm"
                >
                  <p className="font-medium">{a.fullName}</p>
                  <p className="text-[var(--color-text-secondary)]">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                  </p>
                  <p className="text-[var(--color-text-muted)]">
                    {a.city}
                    {a.state ? `, ${a.state}` : ""} {a.postalCode || ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <AddAddressForm />
        </section>
      </div>

      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Referrals & Rewards</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-secondary)] p-4">
            <p className="text-3xl font-semibold tabular-nums">
              {user.referrals.length}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">Joined</p>
          </div>
          <div className="sm:col-span-2 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Your Referral Code
              </p>
              <p className="mt-1 font-mono text-lg font-semibold">{code}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Your Referral Link
              </p>
              <p className="mt-1 break-all text-sm text-[var(--color-info)]">
                {referralLink}
              </p>
            </div>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Users You&apos;ve Referred</p>
          {user.referrals.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              You haven&apos;t referred anyone yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {user.referrals.map((r) => (
                <li key={r.id} className="text-sm">
                  {r.name || r.email} · joined{" "}
                  {r.createdAt.toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <PreferencesForm
          emailAlerts={user.emailAlerts}
          smsAlerts={user.smsAlerts}
        />
        <ChangePasswordForm />
      </div>

      <form action={saveAudienceConsentAction} className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Privacy & audience</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Controls first-party analytics and marketing segments. Individual
          activity is never shared with vendors.
        </p>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="font-medium">Analytics opt-in</span>
            <span className="block text-[var(--color-text-muted)]">
              Product views for aggregate insights
            </span>
          </span>
          <input
            type="checkbox"
            name="analyticsOptIn"
            defaultChecked={consent?.analyticsOptIn ?? true}
            className="h-4 w-4"
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="font-medium">Marketing opt-in</span>
            <span className="block text-[var(--color-text-muted)]">
              Audience segments for campaigns
            </span>
          </span>
          <input
            type="checkbox"
            name="marketingOptIn"
            defaultChecked={consent?.marketingOptIn ?? false}
            className="h-4 w-4"
          />
        </label>
        <Button type="submit" variant="outline">
          Save privacy prefs
        </Button>
      </form>

      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Favourite Items</h2>
        {user.favourites.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-secondary)] px-4 py-8 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              You haven&apos;t favorited any items yet.
            </p>
            <div className="mt-4 flex justify-center">
              <Button asChild href="/shop" variant="outline">
                Explore More
              </Button>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {user.favourites.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/products/${f.product.slug}`}
                  className="block rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] px-3 py-3 text-sm font-medium hover:underline"
                >
                  {f.product.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-[var(--color-text-muted)]">
        Account deactivation is available on request via support — not exposed as
        a destructive one-click action.
      </p>
    </div>
  );
}
