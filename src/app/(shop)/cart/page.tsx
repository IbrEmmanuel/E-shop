import Link from "next/link";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { getSessionUser } from "@/lib/auth";
import { getGuestKey } from "@/lib/guest";
import { formatMoney } from "@/lib/money";
import { buildMetadata } from "@/lib/seo";
import { getCartTotals, getOrCreateCart } from "@/services/cart";

export const metadata = buildMetadata({
  title: "Cart",
  path: "/cart",
  noIndex: true,
});

export default async function CartPage() {
  const user = await getSessionUser();
  const guestKey = user ? null : await getGuestKey();

  if (!user && !guestKey) {
    return (
      <div className="container-page py-14">
        <EmptyState
          title="Your cart is empty"
          description="Browse the shop and add something you love."
          action={
            <Button asChild href="/shop" variant="accent">
              Continue shopping
            </Button>
          }
        />
      </div>
    );
  }

  let cart;
  let totals;
  try {
    cart = await getOrCreateCart({ userId: user?.id, guestKey });
    totals = await getCartTotals({ userId: user?.id, guestKey });
  } catch {
    return (
      <div className="container-page py-14">
        <EmptyState title="Cart unavailable" description="Try again shortly." />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="container-page py-14">
        <EmptyState
          title="Your cart is empty"
          description="Browse the shop and add something you love."
          action={
            <Button asChild href="/shop" variant="accent">
              Continue shopping
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="type-h1">Cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <ul className="space-y-4">
          {cart.items.map((item) => {
            const line = totals.lines.find((l) => l.itemId === item.id);
            return (
              <li key={item.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="font-semibold hover:underline"
                  >
                    {item.product.title}
                  </Link>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {item.product.vendor.storeName}
                  </p>
                  <p className="mt-1 font-medium tabular-nums">
                    {line
                      ? formatMoney(line.unitPriceMinor, line.currency)
                      : "—"}
                  </p>
                  {!line?.inStock ? (
                    <p className="mt-1 text-sm text-[var(--color-danger)]">
                      Unavailable or low stock
                    </p>
                  ) : null}
                </div>
                <form action={updateCartItemAction} className="flex items-center gap-2">
                  <input type="hidden" name="itemId" value={item.id} />
                  <Input
                    name="quantity"
                    type="number"
                    min={0}
                    max={99}
                    defaultValue={item.quantity}
                    className="w-20"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    Update
                  </Button>
                </form>
                <form action={removeCartItemAction}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Remove
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
        <aside className="card h-fit space-y-4 p-6 shadow-[var(--shadow-md)]">
          <h2 className="text-lg font-semibold">Summary</h2>
          <div className="flex justify-between text-sm">
            <span>Subtotal ({totals.itemCount} items)</span>
            <span className="font-semibold tabular-nums">
              {formatMoney(totals.subtotalMinor, totals.currency)}
            </span>
          </div>
          <Button
            asChild
            href="/checkout"
            variant="primary"
            className="w-full"
          >
            Checkout
          </Button>
          <Button asChild href="/shop" variant="outline" className="w-full">
            Continue shopping
          </Button>
        </aside>
      </div>
    </div>
  );
}
