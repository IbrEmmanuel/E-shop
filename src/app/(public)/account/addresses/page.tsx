import { AddAddressForm } from "@/components/forms/profile-forms";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { deleteAddressAction } from "@/app/actions/profile";
import { ensureUserWorkspace } from "@/services/workspace";

export default async function AccountAddressesPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const workspace = await ensureUserWorkspace(session);

  return (
    <div>
      <header className="account-hero">
        <h1 className="account-hero__title">Addresses</h1>
        <p className="account-hero__lede">
          Delivery locations we can use when you check out.
        </p>
      </header>

      <section className="account-panel mb-4">
        <div className="account-panel__head">
          <h2 className="account-panel__title">Saved</h2>
        </div>
        {workspace.addresses.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            No addresses yet. Add one below.
          </p>
        ) : (
          workspace.addresses.map((a) => (
            <div key={a.id} className="account-address">
              <p className="font-semibold">{a.fullName}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.city}
                {a.state ? `, ${a.state}` : ""}
                {a.postalCode ? ` ${a.postalCode}` : ""}
                <br />
                {a.country}
                {a.phone ? ` · ${a.phone}` : ""}
              </p>
              <form action={deleteAddressAction} className="mt-2">
                <input type="hidden" name="addressId" value={a.id} />
                <Button type="submit" size="sm" variant="ghost">
                  Remove
                </Button>
              </form>
            </div>
          ))
        )}
      </section>

      <section className="account-panel">
        <div className="account-panel__head">
          <h2 className="account-panel__title">Add address</h2>
        </div>
        <AddAddressForm />
      </section>
    </div>
  );
}
