"use client";

import { useActionState } from "react";
import {
  submitReviewAction,
  type ActionResult,
} from "@/app/actions/reviews";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProductReviewForm({
  productId,
  canReview,
}: {
  productId: string;
  canReview: boolean;
}) {
  const [state, action, pending] = useActionState(
    submitReviewAction,
    null as ActionResult | null,
  );

  if (!canReview) return null;

  return (
    <form action={action} className="mt-6 space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
      <input type="hidden" name="productId" value={productId} />
      <h3 className="font-semibold">Write a review</h3>
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <div>
        <Label htmlFor="rating">Rating</Label>
        <select
          id="rating"
          name="rating"
          required
          className="select mt-0 w-full"
          defaultValue="5"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="title">Title (optional)</Label>
        <Input id="title" name="title" maxLength={120} />
      </div>
      <div>
        <Label htmlFor="body">Review</Label>
        <Textarea id="body" name="body" required rows={4} minLength={8} />
      </div>
      <Button type="submit" size="sm" variant="primary" loading={pending}>
        Submit review
      </Button>
    </form>
  );
}

export function ProductReviewsList({
  reviews,
  average,
  count,
}: {
  reviews: {
    id: string;
    rating: number;
    title: string | null;
    body: string;
    createdAt: Date;
    user: { name: string | null; firstName: string | null };
  }[];
  average: number;
  count: number;
}) {
  return (
    <section className="mt-12 border-t border-[var(--color-border)] pt-10">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        Reviews
      </h2>
      {count > 0 ? (
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {average.toFixed(1)} average · {count} review{count === 1 ? "" : "s"}
        </p>
      ) : (
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          No reviews yet.
        </p>
      )}
      <ul className="mt-6 space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="border-b border-[var(--color-border)] pb-4">
            <p className="text-sm font-semibold">
              {r.rating}/5 ·{" "}
              {r.user.firstName || r.user.name || "Customer"}
              {r.title ? ` — ${r.title}` : ""}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {r.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
