"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  type ResetActionResult,
} from "@/app/actions/password-reset";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    null as ResetActionResult | null,
  );

  return (
    <form action={action} className="auth-form auth-stage__form space-y-5">
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <div>
        <Label htmlFor="email">Account email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="auth-form__submit"
        loading={pending}
      >
        Send reset link
      </Button>
    </form>
  );
}
