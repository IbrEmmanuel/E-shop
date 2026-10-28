import { ProductCard } from "@/components/products/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { PublicProduct } from "@/services/products";

export function ProductGrid({
  products,
  emptyTitle = "Nothing here yet",
  emptyDescription = "Products will appear once vendors publish their catalogs.",
}: {
  products: PublicProduct[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (products.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Button asChild href="/sell" variant="accent">
            Become a seller
          </Button>
        }
      />
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
