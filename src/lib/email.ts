import { emailConfigured, emailProvider, getEnv } from "@/lib/env";
import { prisma } from "@/lib/db";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Transactional email via Resend when EMAIL_API_KEY is set.
 * Otherwise delivers to the local outbox (admin can review in Settings).
 */
export async function sendEmail(
  message: EmailMessage,
): Promise<{ delivered: boolean; reason?: string; id?: string }> {
  if (!emailConfigured()) {
    return { delivered: false, reason: "Email delivery is not configured" };
  }

  const provider = emailProvider();

  if (provider === "resend") {
    const env = getEnv();
    const apiKey = process.env.EMAIL_API_KEY!.trim();
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        name?: string;
      };

      if (!res.ok) {
        await prisma.emailOutbox
          .create({
            data: {
              toAddress: message.to,
              subject: message.subject,
              htmlBody: message.html,
              textBody: message.text,
              provider: "resend",
              status: "FAILED",
              error: body.message || body.name || `HTTP ${res.status}`,
            },
          })
          .catch(() => undefined);
        return {
          delivered: false,
          reason: body.message || body.name || `Email provider error ${res.status}`,
        };
      }

      const row = await prisma.emailOutbox.create({
        data: {
          toAddress: message.to,
          subject: message.subject,
          htmlBody: message.html,
          textBody: message.text,
          provider: "resend",
          status: "SENT",
          providerId: body.id ?? null,
        },
      });

      return { delivered: true, id: row.id };
    } catch (e) {
      console.error("[email:error]", e);
      return {
        delivered: false,
        reason: e instanceof Error ? e.message : "Email send failed",
      };
    }
  }

  // Local outbox — always available, no external API required
  try {
    const row = await prisma.emailOutbox.create({
      data: {
        toAddress: message.to,
        subject: message.subject,
        htmlBody: message.html,
        textBody: message.text,
        provider: "local",
        status: "SENT",
      },
    });
    console.info("[email:local-outbox]", {
      id: row.id,
      to: message.to,
      subject: message.subject,
    });
    return { delivered: true, id: row.id };
  } catch (e) {
    console.error("[email:outbox-failed]", e);
    return {
      delivered: false,
      reason: e instanceof Error ? e.message : "Local outbox failed",
    };
  }
}
