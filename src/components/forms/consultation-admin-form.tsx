"use client";

import { useActionState } from "react";
import {
  updateConsultationAction,
  type ConsultationActionResult,
} from "@/app/actions/consultations";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export function ConsultationAdminForm({
  id,
  status,
  scheduledAt,
  adminNotes,
}: {
  id: string;
  status: string;
  scheduledAt?: Date | null;
  adminNotes?: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateConsultationAction,
    null as ConsultationActionResult | null,
  );

  const scheduledValue = scheduledAt
    ? new Date(scheduledAt.getTime() - scheduledAt.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  return (
    <form action={action} className="space-y-3 border-t border-[var(--color-border)] pt-4">
      <input type="hidden" name="id" value={id} />
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`status-${id}`}>Status</Label>
          <Select id={`status-${id}`} name="status" defaultValue={status}>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
        <div>
          <Label htmlFor={`scheduled-${id}`}>Scheduled at</Label>
          <Input
            id={`scheduled-${id}`}
            name="scheduledAt"
            type="datetime-local"
            defaultValue={scheduledValue}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`notes-${id}`}>Admin notes</Label>
        <Textarea
          id={`notes-${id}`}
          name="adminNotes"
          defaultValue={adminNotes ?? ""}
          rows={3}
        />
      </div>
      <Button type="submit" size="sm" variant="primary" loading={pending}>
        Save consultation
      </Button>
    </form>
  );
}
