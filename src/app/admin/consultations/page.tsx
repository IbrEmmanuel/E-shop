import Link from "next/link";
import { SectionHeader } from "@/components/dashboard/section-header";
import { ConsultationAdminForm } from "@/components/forms/consultation-admin-form";
import { ConsultationRequestForm } from "@/components/forms/consultation-request-form";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  listConsultations,
  listMyConsultations,
} from "@/services/consultations";
import { payConsultationAction } from "@/app/actions/consultations";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminConsultationsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const session = await getSessionUser();
  const sp = await searchParams;
  const tab = sp.tab === "book" ? "book" : "mine";
  const error =
    typeof sp.error === "string" ? decodeURIComponent(sp.error) : null;

  const mine = await listMyConsultations(session);
  const allAdmin =
    (session?.role === "ADMIN" || session?.role === "SUPER_ADMIN")
      ? await listConsultations(session, { take: 30 })
      : [];

  return (
    <div className="space-y-8">
      <SectionHeader
        showGreeting
        userName={session?.name}
        title="Consultations"
        description="Book and manage engineering assessments."
      />

      <div className="flex gap-2">
        <Link
          href="/admin/consultations"
          className={cn(
            "rounded-[var(--radius-pill)] px-4 py-2 text-sm font-semibold",
            tab === "mine"
              ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
              : "bg-[var(--color-surface-secondary)]",
          )}
        >
          My Consultations
        </Link>
        <Link
          href="/admin/consultations?tab=book"
          className={cn(
            "rounded-[var(--radius-pill)] px-4 py-2 text-sm font-semibold",
            tab === "book"
              ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
              : "bg-[var(--color-surface-secondary)]",
          )}
        >
          Book New
        </Link>
      </div>

      {error ? <Alert tone="warning">{error}</Alert> : null}

      {tab === "book" ? (
        <ConsultationRequestForm
          defaultName={session?.name ?? undefined}
          defaultEmail={session?.email ?? undefined}
        />
      ) : mine.length === 0 ? (
        <EmptyState
          title="No consultations yet"
          description="Book an engineering assessment to get marketplace or catalog guidance."
          action={
            <Button asChild href="/admin/consultations?tab=book" variant="primary">
              Book New
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {mine.map((c) => (
            <li key={c.id} className="card flex flex-col gap-3 p-5 shadow-[var(--shadow-sm)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{c.topic || c.packageName}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {c.packageName}
                  </p>
                </div>
                <Badge
                  tone={
                    c.status === "PENDING"
                      ? "warning"
                      : c.status === "CONFIRMED"
                        ? "success"
                        : "info"
                  }
                >
                  {c.status === "PENDING"
                    ? "Pending"
                    : c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                </Badge>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {(c.scheduledAt || c.preferredAt || c.createdAt).toLocaleString(
                  undefined,
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  },
                )}
              </p>
              <p className="text-sm font-semibold tabular-nums">
                {formatMoney(c.priceMinor, c.currency)} · {c.paymentStatus}
              </p>
              {c.paymentStatus !== "PAID" && c.priceMinor > 0 ? (
                <form action={payConsultationAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <Button type="submit" variant="accent" className="w-full">
                    Pay Now
                  </Button>
                </form>
              ) : (
                <Badge tone="success">Confirmed / paid</Badge>
              )}
            </li>
          ))}
        </ul>
      )}

      {(session?.role === "ADMIN" || session?.role === "SUPER_ADMIN") && allAdmin.length > 0 && tab === "mine" ? (
        <section className="space-y-4 pt-4">
          <h2
            className="text-2xl"
          >
            Desk queue
          </h2>
          <ul className="space-y-4">
            {allAdmin.map((c) => (
              <li key={c.id} className="card space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.topic}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {c.reference} · {c.name} · {c.email}
                    </p>
                  </div>
                  <Badge tone="info">{c.status}</Badge>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {c.message}
                </p>
                <ConsultationAdminForm
                  id={c.id}
                  status={c.status}
                  scheduledAt={c.scheduledAt}
                  adminNotes={c.adminNotes}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
