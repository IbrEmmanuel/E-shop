import { notFound } from "next/navigation";
import { listPublishedProducts } from "@/services/products";
import { getVendorBySlug } from "@/services/vendors";
import { ProductGrid } from "@/components/products/product-grid";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug).catch(() => null);
  return buildMetadata({
    title: vendor?.storeName || "Vendor",
    description: vendor?.description,
    path: `/vendors/${slug}`,
  });
}

export default async function VendorStorefrontPage({ params }: Props) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug).catch(() => null);
  if (!vendor) notFound();

  const { items } = await listPublishedProducts({
    vendorSlug: slug,
    pageSize: 24,
  }).catch(() => ({ items: [] as Awaited<ReturnType<typeof listPublishedProducts>>["items"] }));

  return (
    <div className="container-page py-10 md:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Vendor
        </p>
        <h1
          className="type-h1 mt-1"
        >
          {vendor.storeName}
        </h1>
        {vendor.description ? (
          <p className="mt-3 text-[var(--color-text-secondary)]">
            {vendor.description}
          </p>
        ) : null}
      </header>
      <ProductGrid
        products={items}
        emptyTitle="This shop has no published products yet"
      />
    </div>
  );
}
