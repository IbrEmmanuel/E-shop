"use client";

import { useActionState } from "react";
import {
  retryFailedImportAction,
  type ImportActionResult,
} from "@/app/actions/imports";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function RetryImportForm({ batchId }: { batchId: string }) {
  const [state, action, pending] = useActionState(
    retryFailedImportAction,
    null as ImportActionResult | null,
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="batchId" value={batchId} />
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? (
        <Alert tone="success">Failed rows retried without duplicating successes.</Alert>
      ) : null}
      <Button type="submit" loading={pending} variant="outline">
        Retry failed rows
      </Button>
    </form>
  );
}
