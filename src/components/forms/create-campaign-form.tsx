"use client";

import { useActionState } from "react";
import {
  createCampaignAction,
  type AdActionResult,
} from "@/app/actions/advertising";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function CreateCampaignForm({
  vendors,
}: {
  vendors: { id: string; storeName: string }[];
}) {
  const [state, action, pending] = useActionState(
    createCampaignAction,
    null as AdActionResult | null,
  );

  return (
    <form action={action} className="card max-w-xl space-y-4 p-6">
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required maxLength={120} />
      </div>
      <div>
        <Label htmlFor="objective">Objective</Label>
        <Select id="objective" name="objective" defaultValue="AWARENESS">
          <option value="AWARENESS">Awareness</option>
          <option value="TRAFFIC">Traffic</option>
          <option value="CONVERSIONS">Conversions</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="budget">Budget (major units)</Label>
        <Input
          id="budget"
          name="budget"
          type="number"
          min={0}
          step="0.01"
          defaultValue={0}
        />
      </div>
      <div>
        <Label htmlFor="vendorId">Vendor (optional)</Label>
        <Select id="vendorId" name="vendorId" defaultValue="">
          <option value="">Platform / any</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.storeName}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startAt">Start</Label>
          <Input id="startAt" name="startAt" type="datetime-local" />
        </div>
        <div>
          <Label htmlFor="endAt">End</Label>
          <Input id="endAt" name="endAt" type="datetime-local" />
        </div>
      </div>
      <Button type="submit" loading={pending}>
        Create draft
      </Button>
    </form>
  );
}
