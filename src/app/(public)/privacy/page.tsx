import { StaticPage } from "@/components/static-page";
import { buildMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/services/settings";

export const metadata = buildMetadata({
  title: "Privacy",
  path: "/privacy",
  description: "How E-Shop collects, uses, and protects personal data.",
});

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  return (
    <StaticPage title="Privacy policy">
      <p>
        {settings.siteName} collects account details, shipping addresses, order
        history, and technical logs required to operate the marketplace. Payment
        card data is processed by our payment partner — we do not store full
        card numbers on our servers.
      </p>
      <p>
        First-party product views and campaign events may power aggregate
        analytics when you opt in. Individual customer activity is never exposed
        to vendors or advertisers. You can update analytics and marketing
        preferences in your profile.
      </p>
      <p>
        To request account deletion or a data export, email{" "}
        <a className="underline" href={`mailto:${settings.supportEmail}`}>
          {settings.supportEmail}
        </a>
        . Vendor rental and payment records may be retained where required for
        accounting and fraud prevention.
      </p>
    </StaticPage>
  );
}
