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
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-12 lg:grid-cols-4 lg:gap-x-8">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
