"use client";

import { useActionState } from "react";
import {
  loginAction,
  registerAction,
  type ActionResult,
} from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(
    loginAction,
    null as ActionResult | null,
  );
  return (
    <form action={action} className="auth-form space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl || "/"} />
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>
      <div className="auth-form__actions">
        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="auth-form__submit"
          loading={pending}
        >
          Sign in
        </Button>
      </div>
    </form>
  );
}

export function RegisterForm({ referralCode }: { referralCode?: string }) {
  const [state, action, pending] = useActionState(
    registerAction,
    null as ActionResult | null,
  );
  return (
    <form action={action} className="auth-form space-y-5">
      {referralCode ? (
        <input type="hidden" name="ref" value={referralCode} />
      ) : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </div>
      <div className="button-group button-group--stack-mobile auth-form__actions">
        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="auth-form__submit"
          loading={pending}
        >
          Create account
        </Button>
        <Button asChild href="/login" variant="outline" size="lg">
          Sign in
        </Button>
      </div>
    </form>
  );
}
