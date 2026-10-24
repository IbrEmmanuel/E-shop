"use client";

import { useActionState } from "react";
import { saveBlogPostAction, type BlogSaveResult } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";

type Props = {
  postId?: string;
  defaults?: {
    title?: string;
    slug?: string;
    excerpt?: string | null;
    body?: string;
    status?: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    tags?: string;
  };
};

export function BlogPostForm({ postId, defaults }: Props) {
  const [state, action, pending] = useActionState(
    saveBlogPostAction,
    null as BlogSaveResult | null,
  );

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-4">
      {postId ? <input type="hidden" name="postId" value={postId} /> : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">Saved.</Alert> : null}

      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={defaults?.title} />
      </div>
      <div>
        <Label htmlFor="slug">Slug (optional)</Label>
        <Input id="slug" name="slug" defaultValue={defaults?.slug} />
      </div>
      <div>
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea id="excerpt" name="excerpt" defaultValue={defaults?.excerpt ?? ""} />
      </div>
      <div>
        <Label htmlFor="body">Body (HTML allowed; keep trusted)</Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={12}
          defaultValue={defaults?.body}
        />
      </div>
      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input id="tags" name="tags" defaultValue={defaults?.tags ?? ""} />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue={defaults?.status ?? "DRAFT"}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="seoTitle">SEO title</Label>
        <Input id="seoTitle" name="seoTitle" defaultValue={defaults?.seoTitle ?? ""} />
      </div>
      <div>
        <Label htmlFor="seoDescription">SEO description</Label>
        <Textarea
          id="seoDescription"
          name="seoDescription"
          defaultValue={defaults?.seoDescription ?? ""}
        />
      </div>
      <div className="button-group">
        <Button type="submit" variant="primary" loading={pending}>
          Save post
        </Button>
      </div>
    </form>
  );
}
