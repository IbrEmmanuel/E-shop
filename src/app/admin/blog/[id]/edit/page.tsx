import { notFound } from "next/navigation";
import { BlogPostForm } from "@/components/forms/blog-post-form";
import { getSessionUser } from "@/lib/auth";
import { adminGetPost } from "@/services/blog";

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  const post = await adminGetPost(user, id);
  if (!post) notFound();

  let tags = "";
  try {
    tags = (JSON.parse(post.tagsJson) as string[]).join(", ");
  } catch {
    tags = "";
  }

  return (
    <div>
      <h1
        className="mb-6 text-3xl"
      >
        Edit post
      </h1>
      <BlogPostForm
        postId={post.id}
        defaults={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          body: post.body,
          status: post.status,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          tags,
        }}
      />
    </div>
  );
}
