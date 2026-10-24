import { ModerateProductForm } from "@/components/forms/moderate-product-form";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      vendor: { select: { storeName: true, slug: true } },
    },
  });

  return (
    <div>
      <h1
        className="mb-6 text-3xl"
      >
        Products
      </h1>
      <ul className="space-y-4">
        {products.map((p) => (
          <li key={p.id} className="card space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {p.vendor.storeName} · {formatMoney(p.priceMinor, p.currency)}
                </p>
              </div>
              <Badge tone="info">{p.status}</Badge>
            </div>
            <ModerateProductForm productId={p.id} />
          </li>
        ))}
        {products.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No products.</p>
        ) : null}
      </ul>
    </div>
  );
}
