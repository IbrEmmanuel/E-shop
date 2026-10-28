"use client";

import { useActionState } from "react";
import {
  moderateProductAction,
  type AdminActionResult,
} from "@/app/actions/admin";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function ModerateProductForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(
    moderateProductAction,
    null as AdminActionResult | null,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="productId" value={productId} />
      <Select name="status" defaultValue="PUBLISHED" className="w-40">
        <option value="PUBLISHED">Publish</option>
        <option value="REJECTED">Reject</option>
        <option value="DRAFT">Draft</option>
        <option value="ARCHIVED">Archive</option>
      </Select>
      <Input
        name="rejectionReason"
        placeholder="Reject reason (if rejecting)"
        className="min-w-[12rem] flex-1"
      />
      <Button type="submit" size="sm" loading={pending}>
        Apply
      </Button>
      {state && !state.ok ? (
        <Alert tone="danger" className="w-full">
          {state.error}
        </Alert>
      ) : null}
      {state?.ok ? (
        <Alert tone="success" className="w-full">
          {state.message}
        </Alert>
      ) : null}
    </form>
  );
}
