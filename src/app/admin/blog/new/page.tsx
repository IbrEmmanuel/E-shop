import { BlogPostForm } from "@/components/forms/blog-post-form";

export default function AdminBlogNewPage() {
  return (
    <div>
      <h1
        className="mb-6 text-3xl"
      >
        New blog post
      </h1>
      <BlogPostForm />
    </div>
  );
}
