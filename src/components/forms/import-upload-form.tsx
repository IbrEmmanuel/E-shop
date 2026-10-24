"use client";

import { useActionState } from "react";
import {
  uploadImportAction,
  type ImportActionResult,
} from "@/app/actions/imports";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function ImportUploadForm({
  vendors,
}: {
  vendors?: { id: string; storeName: string }[];
}) {
  const [state, action, pending] = useActionState(
    uploadImportAction,
    null as ImportActionResult | null,
  );
  return (
    <form action={action} className="card max-w-lg space-y-4 p-6">
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {vendors && vendors.length > 0 ? (
        <div>
          <Label htmlFor="vendorId">Vendor</Label>
          <Select id="vendorId" name="vendorId" required defaultValue={vendors[0]?.id}>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.storeName}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <div>
        <Label htmlFor="file">CSV or XLSX file</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          required
          className="input"
        />
      </div>
      <div>
        <Label htmlFor="mode">Mode</Label>
        <Select id="mode" name="mode" defaultValue="UPSERT">
          <option value="UPSERT">Upsert by SKU</option>
          <option value="CREATE_ONLY">Create only</option>
          <option value="UPDATE_BY_SKU">Update by SKU</option>
        </Select>
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">
        Templates:{" "}
        <a href="/api/imports/template?format=csv" className="underline">
          CSV
        </a>
        {" · "}
        <a href="/api/imports/template?format=xlsx" className="underline">
          XLSX
        </a>
      </p>
      <Button type="submit" loading={pending}>
        Upload & validate
      </Button>
    </form>
  );
}
