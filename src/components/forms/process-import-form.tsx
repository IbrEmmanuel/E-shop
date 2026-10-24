"use client";

import { useActionState } from "react";
import {
  processImportAction,
  type ImportActionResult,
} from "@/app/actions/imports";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ProcessImportForm({ batchId }: { batchId: string }) {
  const [state, action, pending] = useActionState(
    processImportAction,
    null as ImportActionResult | null,
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="batchId" value={batchId} />
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">Batch processed.</Alert> : null}
      <Button type="submit" loading={pending} variant="accent">
        Process batch
      </Button>
    </form>
  );
}
