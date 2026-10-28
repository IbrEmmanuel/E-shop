import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/products/safe-image";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/db";

export default async function VendorProductsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/vendor/products");

  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
  if (!vendor) redirect("/vendor/apply");

  const products = await prisma.product.findMany({
    where: { vendorId: vendor.id },
    orderBy: { updatedAt: "desc" },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });

  return (
    <div>
      <header className="account-hero">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="account-hero__title">Products</h1>
            <p className="account-hero__lede">
              Inventory and listings for {vendor.storeName}.
            </p>
          </div>
          <Button asChild href="/vendor/products/new" variant="accent" size="sm">
            New product
          </Button>
        </div>
      </header>

      {products.length === 0 ? (
        <div className="account-panel space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No products yet. Add your first listing.
          </p>
          <Button asChild href="/vendor/products/new" variant="primary" size="sm">
            Create product
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => {
            const image = p.images[0]?.url;
            return (
              <li key={p.id} className="account-panel !p-3">
                <Link
                  href={`/vendor/products/${p.id}/edit`}
                  className="flex gap-3"
                >
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--color-bg-subtle)]">
                    {image ? (
                      <SafeImage
                        src={image}
                        alt={p.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.title}</p>
                    <p className="mt-0.5 text-sm tabular-nums">
                      {formatMoney(p.priceMinor, p.currency)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge tone="info">{p.status}</Badge>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Stock {p.inventoryQty}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
