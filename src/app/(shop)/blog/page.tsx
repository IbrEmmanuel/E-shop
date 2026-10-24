import Link from "next/link";
import { listPublished } from "@/services/blog";
import { EmptyState } from "@/components/ui/empty-state";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Blog",
  description: "Stories, guides, and marketplace notes from E-Shop.",
  path: "/blog",
});

export default async function BlogIndexPage() {
  const { items } = await listPublished({ pageSize: 20 }).catch(() => ({
    items: [],
  }));

  return (
    <div className="container-page py-14 md:py-20">
      <header className="max-w-2xl">
        <h1 className="type-h1 !text-[clamp(2.2rem,4vw,3.25rem)]">Blog</h1>
        <p className="type-body mt-3">Editorial notes from the marketplace.</p>
      </header>
      {items.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            title="No posts yet"
            description="Published articles will appear here."
          />
        </div>
      ) : (
        <ul className="mt-14 grid gap-10 md:grid-cols-2 md:gap-12">
          {items.map((post) => (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="editorial-tile group block"
              >
                <h2 className="type-h2 !text-[clamp(1.35rem,2.5vw,1.85rem)] transition-colors group-hover:text-[var(--color-primary)]">
                  {post.title}
                </h2>
                {post.excerpt ? (
                  <p className="type-body mt-3 line-clamp-3">{post.excerpt}</p>
                ) : null}
                <p
                  className="mt-4 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-soft-muted)]"
                  suppressHydrationWarning
                >
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString("en-NG", {
                        timeZone: "Africa/Lagos",
                      })
                    : null}
                  {post.author?.name ? ` · ${post.author.name}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
