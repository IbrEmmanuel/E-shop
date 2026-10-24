import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { adminListPosts } from "@/services/blog";
import { Badge } from "@/components/ui/badge";

export default async function AdminBlogPage() {
  const user = await getSessionUser();
  const { items } = await adminListPosts(user, { pageSize: 50 });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1
          className="text-3xl"
        >
          Blog
        </h1>
        <Link href="/admin/blog/new" className="button button--primary">
          New post
        </Link>
      </div>
      <ul className="space-y-3">
        {items.map((p) => (
          <li key={p.id} className="card flex justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{p.title}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {p.author?.email} · /blog/{p.slug}
              </p>
            </div>
            <div className="text-right">
              <Badge tone={p.status === "PUBLISHED" ? "success" : "info"}>
                {p.status}
              </Badge>
              <p className="mt-2 space-x-3 text-sm">
                <Link href={`/admin/blog/${p.id}/edit`} className="underline">
                  Edit
                </Link>
                {p.status === "PUBLISHED" ? (
                  <Link href={`/blog/${p.slug}`} className="underline">
                    View
                  </Link>
                ) : null}
              </p>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No posts.</p>
        ) : null}
      </ul>
    </div>
  );
}
