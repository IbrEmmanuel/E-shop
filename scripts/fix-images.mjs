/**
 * Upscale product image URLs + fill category / vendor cover photos from catalog.
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

function hiRes(url) {
  if (!url?.includes("images.unsplash.com")) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("w", "1400");
    u.searchParams.set("q", "85");
    u.searchParams.set("auto", "format");
    u.searchParams.set("fit", "crop");
    return u.toString();
  } catch {
    return url;
  }
}

const CATEGORY_FALLBACK = {
  inverters:
    "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=900&q=85&auto=format&fit=crop",
  "lithium-batteries":
    "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=900&q=85&auto=format&fit=crop",
  headphones:
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=85&auto=format&fit=crop",
  "smart-watches":
    "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=900&q=85&auto=format&fit=crop",
  fashion:
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=85&auto=format&fit=crop",
  "audio-amplifiers":
    "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=900&q=85&auto=format&fit=crop",
  phones:
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&q=85&auto=format&fit=crop",
  electronics:
    "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=900&q=85&auto=format&fit=crop",
  general:
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=85&auto=format&fit=crop",
  home: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=85&auto=format&fit=crop",
};

async function main() {
  const images = await p.productImage.findMany();
  let imgUpdated = 0;
  for (const img of images) {
    const next = hiRes(img.url);
    if (next !== img.url) {
      await p.productImage.update({
        where: { id: img.id },
        data: { url: next },
      });
      imgUpdated += 1;
    }
  }

  const categories = await p.category.findMany();
  let catUpdated = 0;
  for (const cat of categories) {
    const product = await p.product.findFirst({
      where: {
        categoryId: cat.id,
        status: "PUBLISHED",
        images: { some: {} },
      },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { publishedAt: "desc" },
    });
    const cover =
      product?.images[0]?.url ||
      CATEGORY_FALLBACK[cat.slug] ||
      cat.imageUrl;
    if (cover && cover !== cat.imageUrl) {
      await p.category.update({
        where: { id: cat.id },
        data: { imageUrl: cover },
      });
      catUpdated += 1;
    }
  }

  const vendor = await p.vendor.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (vendor && !vendor.bannerUrl) {
    const cover = await p.productImage.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (cover) {
      await p.vendor.update({
        where: { id: vendor.id },
        data: {
          bannerUrl: hiRes(cover.url),
          logoUrl: vendor.logoUrl || hiRes(cover.url),
        },
      });
    }
  }

  // Prefer catalog categories with images on the home lane order
  const preferred = [
    "phones",
    "inverters",
    "lithium-batteries",
    "headphones",
    "smart-watches",
    "fashion",
    "audio-amplifiers",
  ];
  for (const [i, slug] of preferred.entries()) {
    await p.category.updateMany({
      where: { slug },
      data: { sortOrder: i, isActive: true },
    });
  }

  console.log(
    JSON.stringify({ imgUpdated, catUpdated, categories: categories.length }),
  );
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
