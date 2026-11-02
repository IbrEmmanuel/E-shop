import Link from "next/link";
import { redirect } from "next/navigation";
import { archiveProductAction } from "@/app/actions/vendor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/products/safe-image";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { isStaffRole } from "@/lib/roles";
import { resolveVendorDesk, vendorDeskQuery } from "@/lib/vendor-desk";
import { prisma } from "@/lib/db";

export default async function VendorProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ vendorId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/vendor/products");

  const params = (await searchParams) ?? {};
  const desk = await resolveVendorDesk({
    userId: user.id,
    role: user.role,
    vendorId: params.vendorId,
  });

  if (!desk.ok) {
    if (isStaffRole(user.role)) redirect("/admin/vendors");
    redirect("/vendor/apply");
  }

  const { vendor, inspecting } = desk;
  const q = vendorDeskQuery(vendor.id, inspecting);
  const newHref = inspecting
    ? `/vendor/products/new?vendorId=${encodeURIComponent(vendor.id)}`
    : "/vendor/products/new";

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
            {inspecting ? (
              <Badge tone="warning" className="mb-2">
                Inspecting as admin
              </Badge>
            ) : null}
            <h1 className="account-hero__title">Products</h1>
            <p className="account-hero__lede">
              Inventory and listings for {vendor.storeName} only — other vendors
              cannot see or edit these.
            </p>
          </div>
          <Button asChild href={newHref} variant="accent" size="sm">
            New product
          </Button>
        </div>
      </header>

      {products.length === 0 ? (
        <div className="account-panel space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No products yet. Add your first listing.
          </p>
          <Button asChild href={newHref} variant="primary" size="sm">
            Create product
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => {
            const image = p.images[0]?.url;
            const editHref = inspecting
              ? `/vendor/products/${p.id}/edit?vendorId=${encodeURIComponent(vendor.id)}`
              : `/vendor/products/${p.id}/edit`;
            return (
              <li key={p.id} className="account-panel !p-3">
                <div className="flex gap-3">
                  <Link href={editHref} className="flex min-w-0 flex-1 gap-3">
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
                  {p.status !== "ARCHIVED" ? (
                    <form action={archiveProductAction} className="shrink-0 self-start">
                      <input type="hidden" name="productId" value={p.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Archive
                      </Button>
                    </form>
                  ) : null}
                </div>
                <p className="mt-2 text-right text-xs">
                  <Link href={editHref} className="font-semibold underline">
                    Edit
                  </Link>
                  {q ? (
                    <>
                      {" · "}
                      <Link href={`/vendor${q}`} className="underline">
                        Overview
                      </Link>
                    </>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
