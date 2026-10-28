"use client";

import { useActionState } from "react";
import {
  resetPasswordAction,
  type ResetActionResult,
} from "@/app/actions/password-reset";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [state, action, pending] = useActionState(
    resetPasswordAction,
    null as ResetActionResult | null,
  );

  return (
    <form action={action} className="auth-form auth-stage__form mt-4 space-y-5">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <div>
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="auth-form__submit"
        loading={pending}
      >
        Update password
      </Button>
    </form>
  );
}
