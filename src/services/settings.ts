import { prisma } from "@/lib/db";

export type SiteSettings = {
  siteName: string;
  supportEmail: string;
  currencyDefault: string;
  commissionBpsDefault: number;
  tagline: string;
};

const defaults: SiteSettings = {
  siteName: "E-Shop",
  supportEmail: "support@eshop.market",
  currencyDefault: "NGN",
  commissionBpsDefault: 1000,
  tagline:
    "A curated multi-vendor marketplace. Discover makers, rent a shop monthly, and sell with confidence.",
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const rows = await prisma.storeSetting.findMany({
      where: {
        key: {
          in: [
            "site_name",
            "support_email",
            "currency_default",
            "commission_bps_default",
            "site_tagline",
          ],
        },
      },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.valueJson]));
    return {
      siteName: parseJson(map.site_name, defaults.siteName),
      supportEmail: parseJson(map.support_email, defaults.supportEmail),
      currencyDefault: parseJson(map.currency_default, defaults.currencyDefault),
      commissionBpsDefault: parseJson(
        map.commission_bps_default,
        defaults.commissionBpsDefault,
      ),
      tagline: parseJson(map.site_tagline, defaults.tagline),
    };
  } catch {
    return defaults;
  }
}
