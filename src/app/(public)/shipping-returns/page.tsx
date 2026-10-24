import { StaticPage } from "@/components/static-page";
import { buildMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/services/settings";

export const metadata = buildMetadata({
  title: "Shipping & returns",
  path: "/shipping-returns",
  description: "Shipping timelines, delivery regions, and return policy.",
});

export default async function ShippingReturnsPage() {
  const settings = await getSiteSettings();
  return (
    <StaticPage title="Shipping & returns">
      <h2 className="text-lg font-semibold">Shipping</h2>
      <p>
        Delivery windows are set by each vendor and confirmed on your order
        receipt. Most domestic parcels dispatch within 1–3 business days after
        payment clears. You will receive tracking when the vendor marks the
        order as shipped.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Returns</h2>
      <p>
        Unused items in original packaging may be returned within 7 days of
        delivery unless the listing marks the product as final sale. Damaged or
        incorrect items should be reported promptly with photos and your order
        number.
      </p>
      <p>
        Start a return or shipping question at{" "}
        <a className="underline" href={`mailto:${settings.supportEmail}`}>
          {settings.supportEmail}
        </a>
        .
      </p>
    </StaticPage>
  );
}
