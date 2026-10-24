import { z } from "zod";
import type { BlogPost, Prisma } from "@prisma/client";
import type { BlogPostStatus } from "@/lib/types";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { requireAdmin, type SessionUser } from "@/lib/permissions";
import { slugify, uniqueSlug } from "@/lib/slug";

const listPublishedSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
  tag: z.string().trim().max(64).optional(),
});

export async function listPublished(
  raw: z.input<typeof listPublishedSchema> = {},
) {
  const input = listPublishedSchema.parse(raw);
  const where: Prisma.BlogPostWhereInput = {
    status: "PUBLISHED",
    publishedAt: { lte: new Date() },
  };

  if (input.tag) {
    // tags stored as JSON array string — filter in memory for SQLite simplicity
    const all = await prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        featuredAlt: true,
        publishedAt: true,
        tagsJson: true,
        author: { select: { id: true, name: true } },
      },
    });
    const filtered = all.filter((p) => {
      try {
        const tags = JSON.parse(p.tagsJson) as string[];
        return tags.map((t) => t.toLowerCase()).includes(input.tag!.toLowerCase());
      } catch {
        return false;
      }
    });
    const total = filtered.length;
    const start = (input.page - 1) * input.pageSize;
    return {
      items: filtered.slice(start, start + input.pageSize),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  const [total, items] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        featuredAlt: true,
        publishedAt: true,
        tagsJson: true,
        author: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { items, total, page: input.page, pageSize: input.pageSize };
}

export async function getBySlug(slug: string) {
  return prisma.blogPost.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
  });
}

const upsertSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(120).optional(),
  excerpt: z.string().trim().max(500).optional().nullable(),
  body: z.string().trim().min(1),
  featuredImage: z.string().trim().max(2000).optional().nullable(),
  featuredAlt: z.string().trim().max(200).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  seoTitle: z.string().trim().max(200).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
  socialImage: z.string().trim().max(2000).optional().nullable(),
  tags: z.array(z.string().trim().max(64)).max(20).default([]),
});

async function ensureUniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || "post";
  let n = 0;
  for (;;) {
    const found = await prisma.blogPost.findUnique({ where: { slug } });
    if (!found || found.id === excludeId) return slug;
    n += 1;
    slug = uniqueSlug(base, n);
  }
}

export async function adminCreatePost(
  user: SessionUser | null | undefined,
  raw: z.input<typeof upsertSchema>,
): Promise<BlogPost> {
  const admin = requireAdmin(user);
  const input = upsertSchema.parse(raw);
  const slug = await ensureUniqueSlug(input.slug || input.title);

  const post = await prisma.blogPost.create({
    data: {
      authorId: admin.id,
      title: input.title,
      slug,
      excerpt: input.excerpt ?? null,
      body: input.body,
      featuredImage: input.featuredImage ?? null,
      featuredAlt: input.featuredAlt ?? null,
      status: input.status as BlogPostStatus,
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      socialImage: input.socialImage ?? null,
      tagsJson: JSON.stringify(input.tags),
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "blog.created",
    entityType: "BlogPost",
    entityId: post.id,
  });

  return post;
}

export async function adminUpdatePost(
  user: SessionUser | null | undefined,
  postId: string,
  raw: z.input<typeof upsertSchema>,
): Promise<BlogPost> {
  const admin = requireAdmin(user);
  const input = upsertSchema.parse(raw);

  const existing = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!existing) throw new Error("Post not found");

  const slug = await ensureUniqueSlug(input.slug || input.title, postId);

  const publishedAt =
    input.status === "PUBLISHED"
      ? (existing.publishedAt ?? new Date())
      : existing.publishedAt;

  const post = await prisma.blogPost.update({
    where: { id: postId },
    data: {
      title: input.title,
      slug,
      excerpt: input.excerpt ?? null,
      body: input.body,
      featuredImage: input.featuredImage ?? null,
      featuredAlt: input.featuredAlt ?? null,
      status: input.status as BlogPostStatus,
      publishedAt: input.status === "PUBLISHED" ? publishedAt : existing.publishedAt,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      socialImage: input.socialImage ?? null,
      tagsJson: JSON.stringify(input.tags),
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "blog.updated",
    entityType: "BlogPost",
    entityId: post.id,
  });

  return post;
}

export async function adminDeletePost(
  user: SessionUser | null | undefined,
  postId: string,
): Promise<void> {
  const admin = requireAdmin(user);
  const existing = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!existing) throw new Error("Post not found");

  await prisma.blogPost.delete({ where: { id: postId } });
  await writeAuditLog({
    actorId: admin.id,
    action: "blog.deleted",
    entityType: "BlogPost",
    entityId: postId,
  });
}

export async function adminListPosts(
  user: SessionUser | null | undefined,
  opts?: { status?: BlogPostStatus; page?: number; pageSize?: number },
) {
  requireAdmin(user);
  const page = opts?.page ?? 1;
  const pageSize = Math.min(opts?.pageSize ?? 20, 100);
  const where: Prisma.BlogPostWhereInput = {};
  if (opts?.status) where.status = opts.status;

  const [total, items] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return { items, total, page, pageSize };
}

export async function adminGetPost(
  user: SessionUser | null | undefined,
  postId: string,
) {
  requireAdmin(user);
  return prisma.blogPost.findUnique({
    where: { id: postId },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });
}
