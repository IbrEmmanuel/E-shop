import { StaticPage } from "@/components/static-page";
import { buildMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/services/settings";

export const metadata = buildMetadata({
  title: "Terms",
  path: "/terms",
  description: "Terms of service for shopping and selling on E-Shop.",
});

export default async function TermsPage() {
  const settings = await getSiteSettings();
  return (
    <StaticPage title="Terms of service">
      <p>
        By using {settings.siteName} you agree to provide accurate account
        information, respect other users, and comply with applicable law.
        Customers agree to pay for orders placed through checkout. Sellers agree
        to honour published inventory, fulfill paid orders, and keep monthly shop
        rent current when operating a storefront.
      </p>
      <p>
        Listings must describe lawful goods with honest photos and pricing.
        Sponsored placements are labelled as advertising. We may suspend
        accounts that abuse inventory, manipulate reviews or ads, or attempt
        payment fraud.
      </p>
      <p>
        Questions about these terms:{" "}
        <a className="underline" href={`mailto:${settings.supportEmail}`}>
          {settings.supportEmail}
        </a>
        .
      </p>
    </StaticPage>
  );
}
