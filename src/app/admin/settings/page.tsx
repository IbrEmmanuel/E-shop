import { Alert } from "@/components/ui/alert";
import { emailProvider, storageProvider } from "@/lib/env";
import { prisma } from "@/lib/db";
import {
  bankTransferAvailable,
  getSettlementAccounts,
} from "@/lib/payments/settlement";

export default async function AdminSettingsPage() {
  const accounts = getSettlementAccounts();
  const mailProvider = emailProvider();
  const filesProvider = storageProvider();
  const recentMail = await prisma.emailOutbox
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        toAddress: true,
        subject: true,
        provider: true,
        status: true,
        createdAt: true,
      },
    })
    .catch(() => []);

  const rows = [
    {
      label: "Bank / fintech transfer (UBA, OPay)",
      ok: bankTransferAvailable(),
      detail: bankTransferAvailable() ? "Ready" : "Missing accounts",
    },
    {
      label: "Email delivery",
      ok: true,
      detail:
        mailProvider === "resend"
          ? "Resend API"
          : "Local outbox (order & system mail saved here)",
    },
    {
      label: "Object storage",
      ok: true,
      detail:
        filesProvider === "remote"
          ? "S3-compatible bucket"
          : "Local uploads (/public/uploads)",
    },
  ];

  return (
    <div className="max-w-xl space-y-4">
      <h1
        className="text-3xl"
      >
        Settings
      </h1>
      <Alert tone="info">
        Customers pay with OPay, Moniepoint, PalmPay, Kuda, and other banks by
        transferring to your UBA or OPay settlement accounts. Email and file
        uploads work out of the box.
      </Alert>
      <ul className="card divide-y divide-[var(--color-border)]">
        {rows.map((r) => (
          <li key={r.label} className="px-4 py-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium">{r.label}</span>
              <span
                className={
                  r.ok
                    ? "text-[var(--color-success)]"
                    : "text-[var(--color-warning)]"
                }
              >
                {r.ok ? "Configured" : "Not configured"}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {r.detail}
            </p>
          </li>
        ))}
      </ul>

      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">Settlement accounts</h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Set SETTLEMENT_UBA_ACCOUNT / SETTLEMENT_OPAY_ACCOUNT in environment.
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] px-3 py-2"
              >
                <p className="font-semibold">{a.bank}</p>
                <p className="font-mono tabular-nums">{a.accountNumber}</p>
                <p className="text-[var(--color-text-muted)]">{a.accountName}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">Recent email outbox</h2>
        {recentMail.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No messages yet. Order receipts and system mail appear here.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] text-sm">
            {recentMail.map((m) => (
              <li key={m.id} className="py-2">
                <p className="font-medium">{m.subject}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {m.toAddress} · {m.provider} · {m.status} ·{" "}
                  {m.createdAt.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
