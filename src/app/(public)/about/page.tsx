import { StaticPage } from "@/components/static-page";
import { buildMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/services/settings";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    title: "About",
    path: "/about",
    description: `About ${settings.siteName} — curated multi-vendor marketplace with monthly shop rentals.`,
  });
}

export default async function AboutPage() {
  const settings = await getSiteSettings();
  return (
    <StaticPage title={`About ${settings.siteName}`}>
      <p>
        {settings.siteName} is a curated multi-vendor marketplace for
        independent shops. Makers rent a storefront monthly, publish real
        inventory, and sell to customers who value clarity, craft, and reliable
        fulfillment.
      </p>
      <p>
        Every listing is backed by live stock and vendor ownership. Checkout
        runs through our payment partner when configured. Sellers manage
        products, bulk imports, orders, and advertising from one operations
        workspace.
      </p>
      <p>
        Whether you are shopping the catalog or opening your own stall, we focus
        on transparent rentals, labelled sponsored placements, and support you
        can reach at{" "}
        <a className="underline" href={`mailto:${settings.supportEmail}`}>
          {settings.supportEmail}
        </a>
        .
      </p>
    </StaticPage>
  );
}
