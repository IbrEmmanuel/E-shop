"use client";

import { useActionState } from "react";
import {
  approveVendorAction,
  rejectVendorAction,
  type AdminActionResult,
} from "@/app/actions/admin";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminVendorActions({ applicationId }: { applicationId: string }) {
  const [approveState, approveAction, approving] = useActionState(
    approveVendorAction,
    null as AdminActionResult | null,
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    rejectVendorAction,
    null as AdminActionResult | null,
  );
  const state = approveState || rejectState;

  return (
    <div className="space-y-2">
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <form action={approveAction} className="flex gap-2">
          <input type="hidden" name="applicationId" value={applicationId} />
          <Input name="reviewNotes" placeholder="Notes" className="w-40" />
          <Button type="submit" size="sm" loading={approving}>
            Approve
          </Button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <Button type="submit" size="sm" variant="danger" loading={rejecting}>
            Reject
          </Button>
        </form>
      </div>
    </div>
  );
}
