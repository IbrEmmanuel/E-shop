"use client";

import { useActionState } from "react";
import {
  approveVendorAction,
  rejectVendorAction,
  requestVendorChangesAction,
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
  const [changeState, changeAction, changing] = useActionState(
    requestVendorChangesAction,
    null as AdminActionResult | null,
  );
  const state = approveState || rejectState || changeState;

  return (
    <div className="space-y-2">
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <form action={approveAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="applicationId" value={applicationId} />
        <Input name="reviewNotes" placeholder="Approve notes (optional)" className="w-44" />
        <Button type="submit" size="sm" loading={approving}>
          Approve
        </Button>
      </form>
      <form action={changeAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="applicationId" value={applicationId} />
        <Input
          name="reviewNotes"
          placeholder="What is missing?"
          className="w-44"
          required
        />
        <Button type="submit" size="sm" variant="outline" loading={changing}>
          Request changes
        </Button>
      </form>
      <form action={rejectAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="applicationId" value={applicationId} />
        <Input
          name="reviewNotes"
          placeholder="Rejection reason"
          className="w-44"
          required
        />
        <Button type="submit" size="sm" variant="danger" loading={rejecting}>
          Reject
        </Button>
      </form>
    </div>
  );
}
