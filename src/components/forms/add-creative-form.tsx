"use client";

import { useActionState } from "react";
import {
  addCreativeAction,
  type AdActionResult,
} from "@/app/actions/advertising";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function AddCreativeForm({
  campaignId,
  products,
}: {
  campaignId: string;
  products: { id: string; title: string; sku: string }[];
}) {
  const [state, action, pending] = useActionState(
    addCreativeAction,
    null as AdActionResult | null,
  );

  return (
    <form action={action} className="card max-w-xl space-y-4 p-6">
      <input type="hidden" name="campaignId" value={campaignId} />
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">Creative added.</Alert> : null}
      <div>
        <Label htmlFor="type">Type</Label>
        <Select id="type" name="type" defaultValue="SPONSORED_PRODUCT">
          <option value="SPONSORED_PRODUCT">Sponsored product</option>
          <option value="BANNER">Promotional banner</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="productId">Product</Label>
        <Select id="productId" name="productId" defaultValue="">
          <option value="">None (banner)</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.sku})
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={160} />
      </div>
      <div>
        <Label htmlFor="body">Body</Label>
        <Input id="body" name="body" maxLength={2000} />
      </div>
      <div>
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input id="imageUrl" name="imageUrl" />
      </div>
      <div>
        <Label htmlFor="linkUrl">Link URL</Label>
        <Input id="linkUrl" name="linkUrl" placeholder="/products/…" />
      </div>
      <Button type="submit" loading={pending}>
        Add creative
      </Button>
    </form>
  );
}
