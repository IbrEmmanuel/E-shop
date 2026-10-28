import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const n = await p.product.count({ where: { status: "PUBLISHED" } });
const hit = await p.product.count({
  where: {
    status: "PUBLISHED",
    OR: [
      { title: { contains: "Sony", mode: "insensitive" } },
      { title: { contains: "inverter", mode: "insensitive" } },
      { title: { contains: "iPhone", mode: "insensitive" } },
    ],
  },
});
const sample = await p.product.findMany({
  where: { status: "PUBLISHED" },
  take: 2,
  include: { images: true },
  orderBy: { title: "asc" },
});
console.log(JSON.stringify({ published: n, searchHits: hit, sample }, null, 2));
await p.$disconnect();
