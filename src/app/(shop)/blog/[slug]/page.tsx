import { notFound } from "next/navigation";
import { getBySlug } from "@/services/blog";
import { buildMetadata, jsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/env";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getBySlug(slug).catch(() => null);
  if (!post) return buildMetadata({ title: "Post", path: `/blog/${slug}` });
  return buildMetadata({
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    path: `/blog/${slug}`,
    image: post.socialImage || post.featuredImage,
    type: "article",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBySlug(slug).catch(() => null);
  if (!post) notFound();

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.publishedAt?.toISOString(),
    author: post.author?.name
      ? { "@type": "Person", name: post.author.name }
      : undefined,
    image: post.featuredImage || undefined,
    mainEntityOfPage: siteUrl(`/blog/${post.slug}`),
  };

  return (
    <article className="container-page max-w-3xl py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <p className="text-sm text-[var(--color-text-muted)]">
        {post.publishedAt
          ? new Date(post.publishedAt).toLocaleDateString()
          : null}
        {post.author?.name ? ` · ${post.author.name}` : ""}
      </p>
      <h1
        className="type-h1 mt-2"
      >
        {post.title}
      </h1>
      {post.excerpt ? (
        <p className="mt-4 text-lg text-[var(--color-text-secondary)]">
          {post.excerpt}
        </p>
      ) : null}
      <div className="prose mt-10 max-w-none whitespace-pre-wrap leading-relaxed text-[var(--color-text)]">
        {post.body}
      </div>
    </article>
  );
}
