"use client";

import { useActionState } from "react";
import {
  createPlatformShopAction,
  type AdminActionResult,
} from "@/app/actions/admin";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function CreatePlatformShopButton() {
  const [state, action, pending] = useActionState(
    createPlatformShopAction,
    null as AdminActionResult | null,
  );

  return (
    <div className="space-y-3">
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <form action={action}>
        <Button type="submit" variant="primary" loading={pending}>
          Create platform shop
        </Button>
      </form>
      <p className="text-sm text-[var(--color-text-muted)]">
        Products belong to a shop. This creates an official E-Shop store under
        your admin account so you can add listings right away.
      </p>
    </div>
  );
}
