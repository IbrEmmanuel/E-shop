import Link from "next/link";
import { notFound } from "next/navigation";
import { addToCartAction, buyNowAction } from "@/app/actions/cart";
import { toggleFavouriteAction } from "@/app/actions/favourites";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/products/product-grid";
import { SafeImage } from "@/components/products/safe-image";
import { getSessionUser } from "@/lib/auth";
import { getGuestKey } from "@/lib/guest";
import { formatMoney } from "@/lib/money";
import { buildMetadata, jsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/env";
import { recordProductView } from "@/services/advertising";
import { isFavourite } from "@/services/favourites";
import {
  ProductReviewForm,
  ProductReviewsList,
} from "@/components/products/product-reviews";
import {
  getProductBySlug,
  getRelatedProducts,
} from "@/services/products";
import {
  canReviewProduct,
  getProductRatingSummary,
  listProductReviews,
} from "@/services/reviews";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return buildMetadata({ title: "Product", path: `/products/${slug}` });
  return buildMetadata({
    title: product.seoTitle || product.title,
    description: product.seoDescription || product.description.slice(0, 160),
    path: `/products/${slug}`,
    image: product.images[0]?.url,
    type: "product",
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, 4).catch(() => []);
  const available = Math.max(0, product.inventoryQty - product.reservedQty);

  const session = await getSessionUser();
  const guestKey = session ? null : await getGuestKey();
  const favourited = session
    ? await isFavourite(session.id, product.id).catch(() => false)
    : false;
  const [reviews, rating, canReview] = await Promise.all([
    listProductReviews(product.id).catch(() => []),
    getProductRatingSummary(product.id).catch(() => ({
      average: 0,
      count: 0,
    })),
    session
      ? canReviewProduct(session.id, product.id).catch(() => false)
      : Promise.resolve(false),
  ]);
  void recordProductView({
    productId: product.id,
    categoryId: product.categoryId,
    userId: session?.id,
    guestKey,
  }).catch(() => null);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.map((i) => i.url),
    sku: product.sku,
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency,
      price: (product.priceMinor / 100).toFixed(2),
      availability:
        available > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: siteUrl(`/products/${product.slug}`),
    },
    brand: { "@type": "Brand", name: product.vendor.storeName },
  };

  return (
    <div className="container-page py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(ld)}
      />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div
            className="card relative overflow-hidden bg-[var(--color-bg-subtle)] p-0"
            style={{ aspectRatio: "1 / 1" }}
          >
            {product.images[0] ? (
              <SafeImage
                src={product.images[0].url}
                alt={product.images[0].altText || product.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
                No image
              </div>
            )}
          </div>
          {product.images.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(0, 4).map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)]"
                >
                  <SafeImage
                    src={img.url}
                    alt={img.altText || product.title}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="animate-fade-up">
          <Link
            href={`/vendors/${product.vendor.slug}`}
            className="text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
          >
            {product.vendor.storeName}
          </Link>
          <h1 className="type-h1 mt-2">{product.title}</h1>
          <p className="mt-4 font-[family-name:var(--font-display)] text-2xl font-medium tabular-nums text-[var(--text-primary)]">
            {formatMoney(product.priceMinor, product.currency)}
            {product.compareAtMinor && product.compareAtMinor > product.priceMinor ? (
              <span className="ml-2 text-base font-normal text-[var(--color-text-muted)] line-through">
                {formatMoney(product.compareAtMinor, product.currency)}
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {available > 0 ? `${available} in stock` : "Out of stock"}
          </p>
          {/* Desktop / in-flow actions — mobile uses the fixed bar below.
              Outer wrapper needed: .button-group { display:flex } beats Tailwind `hidden`. */}
          <div className="mt-6 hidden md:block">
            <div className="button-group button-group--stack-mobile justify-start">
              <form action={addToCartAction}>
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="quantity" value="1" />
                <Button type="submit" variant="primary" size="lg" disabled={available < 1}>
                  Add to cart
                </Button>
              </form>
              <form action={buyNowAction}>
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="quantity" value="1" />
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  disabled={available < 1}
                >
                  Buy now
                </Button>
              </form>
              <form action={toggleFavouriteAction}>
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="slug" value={product.slug} />
                <Button type="submit" variant="outline" size="lg">
                  {favourited ? "Saved" : "Save"}
                </Button>
              </form>
            </div>
          </div>
          <ul className="mt-4 space-y-1 text-sm text-[var(--color-text-secondary)]">
            <li>Ships from {product.vendor.storeName}</li>
            <li>Secure checkout · order tracking in your account</li>
            <li>Returns follow our shipping & returns policy</li>
          </ul>
          {product.category ? (
            <p className="mt-4 text-sm">
              Category:{" "}
              <Link
                href={`/shop?category=${encodeURIComponent(product.category.slug)}`}
                className="underline"
              >
                {product.category.name}
              </Link>
            </p>
          ) : null}
          <div className="mt-6 whitespace-pre-wrap text-[var(--color-text-secondary)] leading-relaxed">
            {product.description}
          </div>
        </div>
      </div>

      {/* Outside transform ancestors so fixed positioning works above mobile nav */}
      <div className="button-group button-group--stack-mobile fixed inset-x-0 bottom-24 z-[60] justify-start border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 py-3 backdrop-blur-sm md:hidden">
        <form action={addToCartAction}>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="quantity" value="1" />
          <Button type="submit" variant="primary" size="lg" disabled={available < 1}>
            Add to cart
          </Button>
        </form>
        <form action={buyNowAction}>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="quantity" value="1" />
          <Button type="submit" variant="accent" size="lg" disabled={available < 1}>
            Buy now
          </Button>
        </form>
        <form action={toggleFavouriteAction}>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="slug" value={product.slug} />
          <Button type="submit" variant="outline" size="lg">
            {favourited ? "Saved" : "Save"}
          </Button>
        </form>
      </div>
      <div className="h-24 md:hidden" aria-hidden />

      <ProductReviewsList
        reviews={reviews}
        average={rating.average}
        count={rating.count}
      />
      {session ? (
        <ProductReviewForm productId={product.id} canReview={canReview} />
      ) : (
        <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
          <Link href={`/login?callbackUrl=/products/${product.slug}`} className="font-semibold underline">
            Sign in
          </Link>{" "}
          after purchase to leave a review.
        </p>
      )}

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      ) : null}
    </div>
  );
}
