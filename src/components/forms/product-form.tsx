"use client";

import { useActionState, useState } from "react";
import {
  createProductAction,
  updateProductAction,
  type ActionResult,
} from "@/app/actions/vendor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SafeImage } from "@/components/products/safe-image";

type Category = { id: string; name: string };
type ProductDefaults = {
  id?: string;
  title?: string;
  description?: string;
  sku?: string;
  price?: string;
  inventoryQty?: number;
  categoryId?: string | null;
  status?: string;
  imageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export function ProductForm({
  categories,
  product,
  vendors,
  defaultVendorId,
}: {
  categories: Category[];
  product?: ProductDefaults;
  vendors?: { id: string; storeName: string }[];
  defaultVendorId?: string;
}) {
  const isEdit = Boolean(product?.id);
  const [imagePreview, setImagePreview] = useState(product?.imageUrl ?? "");
  const [state, action, pending] = useActionState(
    isEdit ? updateProductAction : createProductAction,
    null as ActionResult | null,
  );

  return (
    <form action={action} className="card max-w-2xl space-y-4 p-6">
      {product?.id ? (
        <input type="hidden" name="productId" value={product.id} />
      ) : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && state.ok && state.message ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}
      {!isEdit && vendors && vendors.length > 0 ? (
        <div>
          <Label htmlFor="vendorId">Vendor shop</Label>
          <Select
            id="vendorId"
            name="vendorId"
            required
            defaultValue={defaultVendorId ?? vendors[0]?.id}
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.storeName}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={product?.title} />
      </div>
      <div>
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" name="sku" required defaultValue={product?.sku} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={6}
          defaultValue={product?.description}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="price">Price (NGN major units)</Label>
          <Input
            id="price"
            name="price"
            required
            placeholder="0.00"
            defaultValue={product?.price}
          />
        </div>
        <div>
          <Label htmlFor="inventoryQty">Inventory</Label>
          <Input
            id="inventoryQty"
            name="inventoryQty"
            type="number"
            min={0}
            required
            defaultValue={product?.inventoryQty ?? 0}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <Select
            id="categoryId"
            name="categoryId"
            defaultValue={product?.categoryId ?? ""}
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            name="status"
            defaultValue={product?.status ?? "DRAFT"}
          >
            <option value="DRAFT">Draft</option>
            <option value="PENDING_REVIEW">Pending review</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input
          id="imageUrl"
          name="imageUrl"
          placeholder="https://…"
          defaultValue={product?.imageUrl ?? ""}
          onChange={(e) => setImagePreview(e.target.value)}
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Paste an image URL to set or replace the product photo.
        </p>
        {imagePreview ? (
          <div className="relative mt-3 aspect-[4/3] w-full max-w-xs overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)]">
            <SafeImage
              src={imagePreview}
              alt="Product preview"
              fill
              className="object-cover"
              sizes="320px"
            />
          </div>
        ) : null}
      </div>
      <div>
        <Label htmlFor="seoTitle">SEO title</Label>
        <Input
          id="seoTitle"
          name="seoTitle"
          defaultValue={product?.seoTitle ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="seoDescription">SEO description</Label>
        <Textarea
          id="seoDescription"
          name="seoDescription"
          defaultValue={product?.seoDescription ?? ""}
        />
      </div>
      <Button type="submit" loading={pending}>
        {isEdit ? "Save product" : "Create product"}
      </Button>
    </form>
  );
}
