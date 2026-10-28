import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/shop",
    "/categories",
    "/sell",
    "/blog",
    "/about",
    "/contact",
    "/shipping-returns",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: siteUrl(path || "/"),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  let products: { slug: string; updatedAt: Date }[] = [];
  let categories: { slug: string; updatedAt: Date }[] = [];
  let vendors: { slug: string; updatedAt: Date }[] = [];
  let posts: { slug: string; updatedAt: Date; publishedAt: Date | null }[] = [];

  try {
    [products, categories, vendors, posts] = await Promise.all([
      prisma.product.findMany({
        where: { status: "PUBLISHED", vendor: { status: "ACTIVE" } },
        select: { slug: true, updatedAt: true },
        take: 50_000,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.vendor.findMany({
        where: { status: "ACTIVE" },
        select: { slug: true, updatedAt: true },
      }),
      prisma.blogPost.findMany({
        where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
        select: { slug: true, updatedAt: true, publishedAt: true },
      }),
    ]);
  } catch {
    return staticRoutes;
  }

  return [
    ...staticRoutes,
    ...products.map((p) => ({
      url: siteUrl(`/products/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({
      url: siteUrl(`/categories/${c.slug}`),
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...vendors.map((v) => ({
      url: siteUrl(`/vendors/${v.slug}`),
      lastModified: v.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...posts.map((p) => ({
      url: siteUrl(`/blog/${p.slug}`),
      lastModified: p.publishedAt ?? p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
