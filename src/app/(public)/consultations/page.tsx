import { ConsultationRequestForm } from "@/components/forms/consultation-request-form";
import { getSessionUser } from "@/lib/auth";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Consultations",
  description:
    "Book a consultation with the E-Shop team about selling, rentals, or imports.",
  path: "/consultations",
});

export default async function ConsultationsPublicPage() {
  const user = await getSessionUser();

  return (
    <div className="container-page max-w-3xl py-14 md:py-20">
      <header className="mb-10 space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Talk with us
        </p>
        <h1
          className="type-h1 text-[var(--color-primary)]"
        >
          Consultations
        </h1>
        <p className="max-w-2xl text-[var(--color-text-secondary)]">
          Need help renting a shop, preparing a CSV import, or planning your
          catalog? Send a request — our team manages it from the admin desk.
        </p>
      </header>
      <ConsultationRequestForm
        defaultName={user?.name ?? undefined}
        defaultEmail={user?.email ?? undefined}
      />
    </div>
  );
}
