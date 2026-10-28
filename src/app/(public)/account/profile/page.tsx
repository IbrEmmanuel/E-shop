import {
  ChangePasswordForm,
  PreferencesForm,
  ProfileDetailsForm,
} from "@/components/forms/profile-forms";
import { getSessionUser } from "@/lib/auth";
import { ensureUserWorkspace } from "@/services/workspace";

export default async function AccountProfilePage() {
  const session = await getSessionUser();
  if (!session) return null;

  const workspace = await ensureUserWorkspace(session);

  return (
    <div>
      <header className="account-hero">
        <h1 className="account-hero__title">Profile</h1>
        <p className="account-hero__lede">
          Your name, alerts, and password for this storefront account.
        </p>
      </header>

      <div className="space-y-4">
        <ProfileDetailsForm
          firstName={workspace.firstName}
          lastName={workspace.lastName}
          phone={workspace.customerProfile?.phone}
        />
        <PreferencesForm
          emailAlerts={workspace.emailAlerts}
          smsAlerts={workspace.smsAlerts}
        />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
