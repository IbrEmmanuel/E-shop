"use client";

import { useActionState, useEffect } from "react";
import {
  confirmVerificationAction,
  type VerifyActionResult,
} from "@/app/actions/email-verification";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ConfirmEmailForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [state, action, pending] = useActionState(
    confirmVerificationAction,
    null as VerifyActionResult | null,
  );

  useEffect(() => {
    // Auto-submit once so the link is one-click
    const form = document.getElementById("confirm-email-form") as HTMLFormElement | null;
    form?.requestSubmit();
  }, []);

  return (
    <form id="confirm-email-form" action={action} className="mt-4 space-y-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <Button type="submit" variant="accent" size="lg" loading={pending}>
        Confirm email
      </Button>
    </form>
  );
}
