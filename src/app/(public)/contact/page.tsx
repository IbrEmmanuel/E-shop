import { StaticPage } from "@/components/static-page";
import { buildMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/services/settings";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    title: "Contact",
    path: "/contact",
    description: `Contact ${settings.siteName} support for orders, rentals, and partnerships.`,
  });
}

export default async function ContactPage() {
  const settings = await getSiteSettings();
  return (
    <StaticPage title="Contact">
      <p>
        Orders, shipping, vendor rentals, and partnerships — email{" "}
        <a className="underline" href={`mailto:${settings.supportEmail}`}>
          {settings.supportEmail}
        </a>
        .
      </p>
      <p>
        Include your order number or store name when relevant. We aim to reply
        within one to two business days (Mon–Fri, WAT).
      </p>
      <p>
        Sellers can also open a consultation from the sell page for onboarding
        and catalog guidance.
      </p>
    </StaticPage>
  );
}
