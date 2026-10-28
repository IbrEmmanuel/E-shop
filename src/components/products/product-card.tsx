import Link from "next/link";
import { Plus } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { addToCartAction, buyNowAction } from "@/app/actions/cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/products/safe-image";
import type { PublicProduct } from "@/services/products";

export function ProductCard({ product }: { product: PublicProduct }) {
  const image = product.images[0];
  const available = Math.max(0, product.inventoryQty - product.reservedQty);
  const onSale =
    product.compareAtMinor != null &&
    product.compareAtMinor > product.priceMinor;

  return (
    <article className="product-card group">
      <div className="product-card__media">
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0 block"
        >
          {image ? (
            <SafeImage
              src={image.url}
              alt={image.altText || product.title}
              fill
              sizes="(max-width:768px) 50vw, (max-width:1200px) 33vw, 25vw"
              className="product-card__photo object-cover transition-transform duration-700 ease-[var(--ease-standard)] group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
              Photo coming soon
            </div>
          )}
        </Link>
        {onSale ? (
          <span className="pointer-events-none absolute left-3 top-3 z-10">
            <Badge tone="accent">Sale</Badge>
          </span>
        ) : null}
        {available < 1 ? (
          <span className="pointer-events-none absolute right-3 top-3 z-10">
            <Badge tone="warning">Sold out</Badge>
          </span>
        ) : null}
      </div>
      <div className="product-card__body">
        <Link href={`/vendors/${product.vendor.slug}`}>
          <p className="product-card__vendor">{product.vendor.storeName}</p>
        </Link>
        <Link href={`/products/${product.slug}`}>
          <h3 className="product-card__title line-clamp-2">{product.title}</h3>
        </Link>
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-2">
            <p className="product-card__price tabular-nums">
              {formatMoney(product.priceMinor, product.currency)}
            </p>
            {onSale ? (
              <p className="text-sm text-[var(--color-text-muted)] line-through tabular-nums">
                {formatMoney(product.compareAtMinor!, product.currency)}
              </p>
            ) : null}
          </div>
          <form action={addToCartAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="quantity" value="1" />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="product-card__add"
              disabled={available < 1}
              aria-label={`Add ${product.title} to cart`}
            >
              <Plus size={18} strokeWidth={2.25} />
            </Button>
          </form>
        </div>
        <div className="product-card__actions">
          <form action={buyNowAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="quantity" value="1" />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={available < 1}
            >
              Buy now
            </Button>
          </form>
        </div>
      </div>
    </article>
  );
}
