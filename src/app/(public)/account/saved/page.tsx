import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/products/safe-image";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { ensureUserWorkspace } from "@/services/workspace";

export default async function AccountSavedPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const workspace = await ensureUserWorkspace(session);
  const items = workspace.favourites;

  return (
    <div>
      <header className="account-hero">
        <h1 className="account-hero__title">Saved</h1>
        <p className="account-hero__lede">
          Pieces you marked while browsing the catalog.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="account-panel space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Nothing saved yet. Tap Save on a product to keep it here.
          </p>
          <Button asChild href="/shop" variant="accent" size="sm">
            Explore the shop
          </Button>
        </div>
      ) : (
        <div className="account-saved-grid">
          {items.map((f) => {
            const p = f.product;
            const img = p.images[0];
            return (
              <Link
                key={f.id}
                href={`/products/${p.slug}`}
                className="account-saved-card"
              >
                <div className="account-saved-card__media">
                  {img ? (
                    <SafeImage
                      src={img.url}
                      alt={img.altText || p.title}
                      fill
                      className="object-cover"
                      sizes="(max-width:700px) 50vw, 25vw"
                    />
                  ) : null}
                </div>
                <p className="account-saved-card__title line-clamp-2">
                  {p.title}
                </p>
                <p className="account-saved-card__price">
                  {formatMoney(p.priceMinor, p.currency)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
