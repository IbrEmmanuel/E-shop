import { trackSponsoredClickAction } from "@/app/actions/advertising";
import { SafeImage } from "@/components/products/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import {
  getActiveSponsoredPlacements,
  recordAdEvent,
} from "@/services/advertising";

export async function SponsoredShelf() {
  const placements = await getActiveSponsoredPlacements(6).catch(() => []);
  if (placements.length === 0) return null;

  // Fire-and-forget impressions (server render). Failures must not block shop.
  await Promise.allSettled(
    placements.map((p) =>
      recordAdEvent({
        campaignId: p.campaign.id,
        creativeId: p.id,
        productId: p.productId,
        eventType: "IMPRESSION",
      }),
    ),
  );

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-2">
        <h2
          className="text-2xl"
        >
          Sponsored
        </h2>
        <Badge tone="warning">Ad</Badge>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {placements.map((p) => {
          const product = p.product;
          if (!product) return null;
          const image = product.images[0];
          const href = `/products/${product.slug}`;
          return (
            <li key={p.id} className="card overflow-hidden">
              <div
                className="relative bg-[var(--color-bg-subtle)]"
                style={{ aspectRatio: "4 / 3" }}
              >
                {image ? (
                  <SafeImage
                    src={image.url}
                    alt={p.title}
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 100vw, 33vw"
                  />
                ) : null}
                <span className="absolute left-2 top-2">
                  <Badge tone="warning">Sponsored</Badge>
                </span>
              </div>
              <div className="space-y-2 p-4">
                <p className="text-xs uppercase text-[var(--color-text-muted)]">
                  {product.vendor.storeName}
                </p>
                <h3 className="font-semibold leading-snug">{p.title}</h3>
                <p className="tabular-nums font-semibold">
                  {formatMoney(product.priceMinor, "NGN")}
                </p>
                <form action={trackSponsoredClickAction}>
                  <input type="hidden" name="campaignId" value={p.campaign.id} />
                  <input type="hidden" name="creativeId" value={p.id} />
                  <input
                    type="hidden"
                    name="productId"
                    value={p.productId ?? ""}
                  />
                  <input type="hidden" name="href" value={href} />
                  <Button type="submit" size="sm" variant="accent">
                    View product
                  </Button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
