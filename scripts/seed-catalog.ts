/**
 * Additive catalog seed — does NOT wipe users/orders.
 * Creates categories + published products with real Unsplash photos.
 *
 * Usage: npx tsx scripts/seed-catalog.ts
 * Requires DATABASE_URL (Neon/Postgres on Vercel, or local).
 */
import { PrismaClient } from "@prisma/client";
import { slugify, uniqueSlug } from "../src/lib/slug";

const prisma = new PrismaClient();

type SeedProduct = {
  title: string;
  description: string;
  sku: string;
  priceNgn: number;
  compareAtNgn?: number;
  category: string;
  inventory: number;
  image: string;
  imageAlt: string;
};

const CATEGORIES: { name: string; slug: string; description: string }[] = [
  {
    name: "Inverters",
    slug: "inverters",
    description: "Solar and hybrid inverters for homes and businesses.",
  },
  {
    name: "Lithium Batteries",
    slug: "lithium-batteries",
    description: "LiFePO4 and lithium packs in multiple capacities.",
  },
  {
    name: "Headphones",
    slug: "headphones",
    description: "Wireless and studio headphones.",
  },
  {
    name: "Smart Watches",
    slug: "smart-watches",
    description: "Fitness and premium smartwatches.",
  },
  {
    name: "Fashion",
    slug: "fashion",
    description: "Unisex clothing and everyday wear.",
  },
  {
    name: "Audio & Amplifiers",
    slug: "audio-amplifiers",
    description: "Amplifiers, loaders, and audio gear.",
  },
  {
    name: "Phones",
    slug: "phones",
    description: "Smartphones from leading brands.",
  },
];

/** Curated Unsplash CDN images (stable photo IDs). */
const PRODUCTS: SeedProduct[] = [
  // Inverters
  {
    title: "Luminous 3.5kVA Pure Sine Wave Inverter",
    description:
      "Reliable 3.5kVA pure sine wave inverter for homes and small shops. Quiet operation, overload protection, and LCD status display. Ideal for TVs, fridges, and lighting during outages.",
    sku: "INV-LUM-35",
    priceNgn: 285000,
    compareAtNgn: 320000,
    category: "inverters",
    inventory: 24,
    image:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Solar inverter and energy equipment",
  },
  {
    title: "Su-Kam Falcon 2.5kVA Hybrid Inverter",
    description:
      "Hybrid-ready 2.5kVA inverter with wide input range and smart charging. Supports solar input when paired with compatible charge controllers.",
    sku: "INV-SUK-25",
    priceNgn: 198000,
    category: "inverters",
    inventory: 30,
    image:
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Power inverter setup",
  },
  {
    title: "Must 5kVA Solar Hybrid Inverter",
    description:
      "5kVA hybrid inverter for mid-size homes. High surge capacity, dual AC output options, and clear LED indicators for battery and load status.",
    sku: "INV-MUST-5K",
    priceNgn: 465000,
    compareAtNgn: 510000,
    category: "inverters",
    inventory: 12,
    image:
      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Solar power system",
  },
  {
    title: "Mercury Elite 1.2kVA Compact Inverter",
    description:
      "Compact 1.2kVA inverter for apartments. Perfect for lights, fans, laptops, and routers. Fast switchover and thermal protection.",
    sku: "INV-MER-12",
    priceNgn: 89000,
    category: "inverters",
    inventory: 40,
    image:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Compact power equipment",
  },
  // Lithium batteries
  {
    title: "LiFePO4 12V 100Ah Lithium Battery",
    description:
      "Deep-cycle LiFePO4 12V 100Ah pack with BMS. Long cycle life, lightweight vs lead-acid, and stable discharge for inverters and solar.",
    sku: "BAT-LFP-100",
    priceNgn: 420000,
    category: "lithium-batteries",
    inventory: 18,
    image:
      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Lithium battery pack",
  },
  {
    title: "LiFePO4 12V 200Ah Lithium Battery",
    description:
      "200Ah LiFePO4 for longer backup. Built-in protection against overcharge, over-discharge, and short circuit.",
    sku: "BAT-LFP-200",
    priceNgn: 780000,
    compareAtNgn: 850000,
    category: "lithium-batteries",
    inventory: 10,
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Energy storage battery",
  },
  {
    title: "LiFePO4 24V 100Ah Rack Battery",
    description:
      "24V 100Ah rack-mount lithium module for hybrid systems. High energy density and modular expansion ready.",
    sku: "BAT-LFP-24-100",
    priceNgn: 695000,
    category: "lithium-batteries",
    inventory: 8,
    image:
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Industrial battery module",
  },
  {
    title: "Portable 48V 50Ah Lithium Pack",
    description:
      "Compact 48V lithium pack for small solar kits and telecom backups. Includes carrying handles and status LEDs.",
    sku: "BAT-LFP-48-50",
    priceNgn: 540000,
    category: "lithium-batteries",
    inventory: 14,
    image:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Portable lithium battery",
  },
  // Headphones
  {
    title: "Sony WH-1000XM5 Wireless Headphones",
    description:
      "Industry-leading noise cancellation, 30-hour battery, multipoint Bluetooth, and premium comfort for travel and work.",
    sku: "HP-SONY-XM5",
    priceNgn: 485000,
    compareAtNgn: 520000,
    category: "headphones",
    inventory: 22,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Black over-ear headphones",
  },
  {
    title: "Apple AirPods Pro (2nd Gen)",
    description:
      "Active Noise Cancellation, Adaptive Audio, MagSafe charging case, and seamless Apple device pairing.",
    sku: "HP-APP-PRO2",
    priceNgn: 395000,
    category: "headphones",
    inventory: 35,
    image:
      "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Wireless earbuds",
  },
  {
    title: "JBL Tune 760NC Headphones",
    description:
      "Lightweight over-ear headphones with noise cancelling, JBL Pure Bass, and up to 35 hours of playtime.",
    sku: "HP-JBL-760",
    priceNgn: 125000,
    category: "headphones",
    inventory: 40,
    image:
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "JBL style headphones",
  },
  {
    title: "Samsung Galaxy Buds2 Pro",
    description:
      "Hi-Fi 24-bit audio, intelligent ANC, and IPX7 water resistance. Tuned for Galaxy phones with seamless switching.",
    sku: "HP-SAM-B2P",
    priceNgn: 210000,
    category: "headphones",
    inventory: 28,
    image:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Wireless earbuds case",
  },
  // Smart watches
  {
    title: "Apple Watch Series 9 GPS 45mm",
    description:
      "Bright Always-On Retina display, advanced health sensors, Crash Detection, and all-day battery life.",
    sku: "SW-APP-S9",
    priceNgn: 620000,
    category: "smart-watches",
    inventory: 16,
    image:
      "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Smartwatch on wrist",
  },
  {
    title: "Samsung Galaxy Watch6 Classic",
    description:
      "Rotating bezel, BioActive sensor, sleep coaching, and Wear OS apps. Premium stainless steel build.",
    sku: "SW-SAM-W6C",
    priceNgn: 455000,
    compareAtNgn: 490000,
    category: "smart-watches",
    inventory: 20,
    image:
      "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Samsung smartwatch",
  },
  {
    title: "Huawei Watch GT 4",
    description:
      "Stylish smartwatch with up to 14-day battery, accurate workout modes, and SpO2 monitoring.",
    sku: "SW-HUA-GT4",
    priceNgn: 185000,
    category: "smart-watches",
    inventory: 25,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Minimal smartwatch",
  },
  {
    title: "Fitbit Charge 6 Fitness Band",
    description:
      "Built-in GPS, heart-rate tracking, Google apps shortcuts, and 7-day battery in a slim unisex design.",
    sku: "SW-FIT-C6",
    priceNgn: 145000,
    category: "smart-watches",
    inventory: 32,
    image:
      "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Fitness tracker band",
  },
  // Fashion unisex
  {
    title: "Unisex Oversized Cotton Tee — Sand",
    description:
      "Heavyweight 220gsm cotton tee with dropped shoulders. Soft wash, unisex fit from S–XXL. Everyday premium basics.",
    sku: "CL-TEE-SAND",
    priceNgn: 18500,
    category: "fashion",
    inventory: 60,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Plain cotton t-shirt",
  },
  {
    title: "Unisex Linen Summer Shirt — Olive",
    description:
      "Breathable linen-blend shirt for hot weather. Relaxed unisex cut, mother-of-pearl buttons, and side vents.",
    sku: "CL-LIN-OLV",
    priceNgn: 32000,
    compareAtNgn: 38000,
    category: "fashion",
    inventory: 45,
    image:
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Linen shirt",
  },
  {
    title: "Unisex Wide-Leg Cargo Trousers",
    description:
      "Utility cargos with adjustable ankle cuffs and deep pockets. Durable twill, unisex sizing.",
    sku: "CL-CRG-BLK",
    priceNgn: 42000,
    category: "fashion",
    inventory: 38,
    image:
      "https://images.unsplash.com/photo-1542272454315-7f6b24074bbb?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Cargo trousers",
  },
  {
    title: "Unisex Hooded Sweatshirt — Charcoal",
    description:
      "Brushed fleece hoodie with kangaroo pocket and reinforced hood. Soft handfeel for daily wear.",
    sku: "CL-HD-CHR",
    priceNgn: 35500,
    category: "fashion",
    inventory: 50,
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Hoodie sweatshirt",
  },
  {
    title: "Unisex Midi Wrap Dress — Indigo",
    description:
      "Soft jersey wrap dress that works for all genders as a long shirt or midi layer. Adjustable tie waist.",
    sku: "CL-DRS-IND",
    priceNgn: 48000,
    category: "fashion",
    inventory: 28,
    image:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Indigo wrap dress",
  },
  {
    title: "Unisex Denim Jacket — Light Wash",
    description:
      "Classic trucker jacket in light wash denim. Metal buttons, chest pockets, and a versatile unisex cut.",
    sku: "CL-DNM-LT",
    priceNgn: 55000,
    category: "fashion",
    inventory: 34,
    image:
      "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Denim jacket",
  },
  // Amplifiers / loaders
  {
    title: "Pioneer GM-A5702 2-Channel Amplifier",
    description:
      "Car audio amplifier with 760W peak power, variable crossover, and compact chassis for boot installs.",
    sku: "AMP-PIO-5702",
    priceNgn: 95000,
    category: "audio-amplifiers",
    inventory: 20,
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Car amplifier",
  },
  {
    title: "Yamaha A-S301 Stereo Amplifier",
    description:
      "Hi-fi stereo amp with Pure Direct mode, digital inputs, and warm analog character for speakers and vinyl.",
    sku: "AMP-YAM-AS301",
    priceNgn: 310000,
    category: "audio-amplifiers",
    inventory: 9,
    image:
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Hi-fi stereo amplifier",
  },
  {
    title: "Sound Loader USB Audio Interface",
    description:
      "Compact USB audio loader/interface for DJs and producers. Low-latency monitoring and plug-and-play drivers.",
    sku: "AMP-LDR-USB",
    priceNgn: 78000,
    category: "audio-amplifiers",
    inventory: 26,
    image:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Audio interface gear",
  },
  {
    title: "Boss Katana-50 MkII Guitar Amplifier",
    description:
      "50W combo amp with onboard effects, USB recording, and stage-ready tone for practice and gigs.",
    sku: "AMP-BOSS-K50",
    priceNgn: 265000,
    category: "audio-amplifiers",
    inventory: 11,
    image:
      "https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Guitar amplifier",
  },
  // Phones
  {
    title: "iPhone 15 Pro 256GB — Natural Titanium",
    description:
      "A17 Pro chip, 48MP camera system, Action Button, and USB-C. Factory sealed with 1-year warranty.",
    sku: "PH-APP-15P-256",
    priceNgn: 1450000,
    compareAtNgn: 1550000,
    category: "phones",
    inventory: 14,
    image:
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "iPhone smartphone",
  },
  {
    title: "Samsung Galaxy S24 Ultra 512GB",
    description:
      "Titanium frame, 200MP camera, S Pen, and Galaxy AI features. Flagship Android performance.",
    sku: "PH-SAM-S24U-512",
    priceNgn: 1380000,
    category: "phones",
    inventory: 12,
    image:
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Samsung Galaxy phone",
  },
  {
    title: "Google Pixel 8 Pro 128GB",
    description:
      "Best-in-class computational photography, 7 years of OS updates, and clean Android experience.",
    sku: "PH-GOO-P8P-128",
    priceNgn: 780000,
    category: "phones",
    inventory: 18,
    image:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Pixel smartphone",
  },
  {
    title: "Xiaomi Redmi Note 13 Pro 256GB",
    description:
      "AMOLED 120Hz display, 200MP camera, fast charging. Strong mid-range value for everyday use.",
    sku: "PH-XIA-RN13P",
    priceNgn: 285000,
    category: "phones",
    inventory: 40,
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Android smartphone",
  },
  {
    title: "Tecno Camon 30 Premier 5G",
    description:
      "Portrait-focused cameras, vibrant AMOLED, and long battery life. Popular for content creators.",
    sku: "PH-TEC-C30P",
    priceNgn: 325000,
    category: "phones",
    inventory: 30,
    image:
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Camon smartphone",
  },
  {
    title: "Infinix Note 40 Pro 256GB",
    description:
      "Curved AMOLED, 70W charging, and stereo speakers. Everyday flagship feel at a mid-range price.",
    sku: "PH-INF-N40P",
    priceNgn: 268000,
    category: "phones",
    inventory: 36,
    image:
      "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=1400&q=85&auto=format&fit=crop",
    imageAlt: "Infinix smartphone",
  },
];

async function ensureVendor() {
  let vendor = await prisma.vendor.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (vendor) {
    await prisma.shopRentalPlan.updateMany({
      where: { slug: "starter" },
      data: { maxProducts: 1_000_000 },
    });
    return vendor;
  }

  const admin = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) {
    throw new Error("No ADMIN/SUPER_ADMIN user — run npm run db:seed first");
  }

  const plan =
    (await prisma.shopRentalPlan.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })) ??
    (await prisma.shopRentalPlan.create({
      data: {
        slug: "starter",
        name: "Starter",
        monthlyPriceMinor: 1_500_000,
        maxProducts: 1_000_000,
        trialDays: 365,
        featuresJson: '["Catalog"]',
      },
    }));

  await prisma.shopRentalPlan.update({
    where: { id: plan.id },
    data: { maxProducts: 1_000_000 },
  });

  const now = new Date();
  const end = new Date(now);
  end.setFullYear(end.getFullYear() + 5);

  vendor = await prisma.vendor.create({
    data: {
      userId: admin.id,
      slug: "eshop-platform",
      storeName: "E-Shop Platform",
      description: "Official marketplace catalog",
      contactEmail: admin.email,
      status: "ACTIVE",
      commissionBps: 0,
      rental: {
        create: {
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: end,
          nextPaymentDue: end,
        },
      },
      wallet: { create: { currency: "NGN" } },
    },
  });
  return vendor;
}

async function main() {
  console.log("[catalog] Ensuring vendor + categories…");
  const vendor = await ensureVendor();

  const categoryMap = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        sortOrder: i,
        isActive: true,
      },
      update: {
        name: c.name,
        description: c.description,
        isActive: true,
        sortOrder: i,
      },
    });
    categoryMap.set(c.slug, row.id);
  }

  console.log(`[catalog] Upserting ${PRODUCTS.length} products…`);
  let created = 0;
  let updated = 0;

  for (const p of PRODUCTS) {
    const categoryId = categoryMap.get(p.category) ?? null;
    const priceMinor = Math.round(p.priceNgn * 100);
    const compareAtMinor =
      p.compareAtNgn != null ? Math.round(p.compareAtNgn * 100) : null;
    const base = slugify(p.title) || p.sku.toLowerCase();
    let slug = uniqueSlug(base, p.sku.toLowerCase());

    const existing = await prisma.product.findUnique({
      where: { vendorId_sku: { vendorId: vendor.id, sku: p.sku } },
      include: { images: true },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          title: p.title,
          description: p.description,
          priceMinor,
          compareAtMinor,
          categoryId,
          inventoryQty: p.inventory,
          status: "PUBLISHED",
          publishedAt: existing.publishedAt ?? new Date(),
          seoTitle: p.title,
          seoDescription: p.description.slice(0, 160),
        },
      });
      if (existing.images[0]) {
        await prisma.productImage.update({
          where: { id: existing.images[0].id },
          data: { url: p.image, altText: p.imageAlt },
        });
      } else {
        await prisma.productImage.create({
          data: {
            productId: existing.id,
            url: p.image,
            altText: p.imageAlt,
            sortOrder: 0,
          },
        });
      }
      updated += 1;
      continue;
    }

    let n = 0;
    while (await prisma.product.findUnique({ where: { slug } })) {
      n += 1;
      slug = uniqueSlug(base, `${p.sku}-${n}`);
    }

    await prisma.product.create({
      data: {
        vendorId: vendor.id,
        categoryId,
        title: p.title,
        slug,
        description: p.description,
        sku: p.sku,
        priceMinor,
        compareAtMinor,
        inventoryQty: p.inventory,
        status: "PUBLISHED",
        publishedAt: new Date(),
        seoTitle: p.title,
        seoDescription: p.description.slice(0, 160),
        images: {
          create: [{ url: p.image, altText: p.imageAlt, sortOrder: 0 }],
        },
      },
    });
    created += 1;
  }

  console.log(
    `[catalog] Done. created=${created} updated=${updated} vendor=${vendor.storeName}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
