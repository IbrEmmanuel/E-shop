import Link from "next/link";
import { CreatePlatformShopButton } from "@/components/forms/create-platform-shop";
import { SectionHeader } from "@/components/dashboard/section-header";
import { VendorTabs } from "@/components/dashboard/vendor-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SafeImage } from "@/components/products/safe-image";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { ensureUserWorkspace } from "@/services/workspace";
import { prisma } from "@/lib/db";

export default async function VendorProductsPage() {
  const session = await getSessionUser();
  const user = await ensureUserWorkspace(session!);
  const isAdmin = (user.role === "ADMIN" || user.role === "SUPER_ADMIN");

  const vendorCount = isAdmin ? await prisma.vendor.count() : 0;

  const products = user.vendor
    ? await prisma.product.findMany({
        where: { vendorId: user.vendor.id },
        orderBy: { updatedAt: "desc" },
        include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
      })
    : isAdmin
      ? await prisma.product.findMany({
          orderBy: { updatedAt: "desc" },
          take: 100,
          include: {
            images: { take: 1, orderBy: { sortOrder: "asc" } },
            vendor: { select: { storeName: true } },
          },
        })
      : [];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Vendor"
        description="Edit product description, price, and image for each listing."
        userName={user.name}
        actions={
          isAdmin && vendorCount > 0 ? (
            <Button asChild href="/admin/vendors/products/new" variant="primary">
              New product
            </Button>
          ) : undefined
        }
      />
      <VendorTabs />

      {isAdmin && vendorCount === 0 ? (
        <div className="card max-w-lg space-y-4 p-6">
          <h3 className="text-lg font-semibold">No shop yet</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            You cannot add products until a shop exists. Create a platform shop
            to start listing immediately.
          </p>
          <CreatePlatformShopButton />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products"
          description="Create a listing or import a CSV from Vendor → Bulk."
          action={
            <Button asChild href="/admin/vendors/products/new" variant="primary">
              New product
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => {
            const image = p.images[0]?.url;
            const editHref = `/admin/vendors/products/${p.id}/edit`;
            const storeName =
              "vendor" in p && p.vendor
                ? (p.vendor as { storeName: string }).storeName
                : null;

            return (
              <li key={p.id} className="card overflow-hidden p-0">
                <div className="flex gap-4 p-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)]">
                    {image ? (
                      <SafeImage
                        src={image}
                        alt={p.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.title}</p>
                        {storeName ? (
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {storeName}
                          </p>
                        ) : null}
                        <p className="text-sm text-[var(--color-text-muted)]">
                          {p.sku} · {formatMoney(p.priceMinor, p.currency)}
                        </p>
                      </div>
                      <Badge
                        tone={p.status === "PUBLISHED" ? "success" : "info"}
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <Link
                      href={editHref}
                      className="mt-3 inline-block text-sm font-semibold text-[var(--color-primary)] underline"
                    >
                      Edit description, price & image
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
