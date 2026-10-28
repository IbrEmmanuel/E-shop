import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function headOk(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (res.ok) return true;
    const get = await fetch(url, { method: "GET", redirect: "follow" });
    return get.ok;
  } catch {
    return false;
  }
}

const REPLACE = {
  // Known-stable Unsplash product shots
  inverters:
    "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1400&q=85&auto=format&fit=crop",
  "lithium-batteries":
    "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1400&q=85&auto=format&fit=crop",
  headphones:
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1400&q=85&auto=format&fit=crop",
  "smart-watches":
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1400&q=85&auto=format&fit=crop",
  fashion:
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1400&q=85&auto=format&fit=crop",
  "audio-amplifiers":
    "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1400&q=85&auto=format&fit=crop",
  phones:
    "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1400&q=85&auto=format&fit=crop",
};

async function main() {
  const cats = await p.category.findMany();
  for (const cat of cats) {
    const ok = cat.imageUrl ? await headOk(cat.imageUrl) : false;
    console.log(`cat ${cat.slug}: ${ok ? "ok" : "BAD"} ${cat.imageUrl?.slice(0, 70)}`);
    if (!ok) {
      const fallback = REPLACE[cat.slug];
      if (fallback) {
        await p.category.update({
          where: { id: cat.id },
          data: { imageUrl: fallback },
        });
        console.log(`  -> fixed with fallback`);
      }
    }
  }

  const imgs = await p.productImage.findMany({
    include: { product: { select: { title: true, sku: true, category: { select: { slug: true } } } } },
  });
  let bad = 0;
  for (const img of imgs) {
    const ok = await headOk(img.url);
    if (!ok) {
      bad += 1;
      const slug = img.product.category?.slug;
      const fallback = (slug && REPLACE[slug]) || REPLACE.phones;
      await p.productImage.update({
        where: { id: img.id },
        data: { url: fallback },
      });
      console.log(`BAD product ${img.product.sku} -> replaced`);
    }
  }
  console.log(JSON.stringify({ checked: imgs.length, replaced: bad }));
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
