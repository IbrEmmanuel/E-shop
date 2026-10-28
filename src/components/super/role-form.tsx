"use client";

import { useActionState } from "react";
import {
  setUserRoleAction,
  setUserStatusAction,
  type SuperActionResult,
} from "@/app/actions/super-admin";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function RoleForm({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const [state, action, pending] = useActionState(
    setUserRoleAction,
    null as SuperActionResult | null,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className="select text-sm"
        aria-label="Role"
      >
        <option value="CUSTOMER">Customer</option>
        <option value="VENDOR">Vendor</option>
        <option value="ADMIN">Admin</option>
        <option value="SUPER_ADMIN">Super admin</option>
      </select>
      <Button type="submit" size="sm" variant="outline" loading={pending}>
        Save
      </Button>
      {state && !state.ok ? (
        <Alert tone="danger" className="w-full">
          {state.error}
        </Alert>
      ) : null}
      {state?.ok && state.message ? (
        <Alert tone="success" className="w-full">
          {state.message}
        </Alert>
      ) : null}
    </form>
  );
}

export function StatusForm({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: string;
}) {
  const [state, action, pending] = useActionState(
    setUserStatusAction,
    null as SuperActionResult | null,
  );
  const next = currentStatus === "DISABLED" ? "ACTIVE" : "DISABLED";

  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" size="sm" variant="ghost" loading={pending}>
        {next === "DISABLED" ? "Disable" : "Enable"}
      </Button>
      {state && !state.ok ? (
        <p className="mt-1 text-xs text-[var(--color-danger)]">{state.error}</p>
      ) : null}
    </form>
  );
}
