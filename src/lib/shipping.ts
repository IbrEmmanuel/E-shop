/**
 * Delivery fees and ETA windows by Nigerian destination.
 * Amounts are in minor units (kobo).
 */

export type DeliveryQuote = {
  shippingMinor: number;
  currency: string;
  zone: string;
  etaMinDays: number;
  etaMaxDays: number;
  label: string;
};

const LAGOS = new Set(["lagos"]);
const SOUTHWEST = new Set(["ogun", "oyo", "ondo", "osun", "ekiti"]);
const FCT = new Set(["abuja", "fct", "federal capital territory"]);
const SOUTH = new Set([
  "rivers",
  "delta",
  "edo",
  "bayelsa",
  "akwa ibom",
  "cross river",
  "anambra",
  "enugu",
  "imo",
  "abia",
  "ebonyi",
]);
const NORTH = new Set([
  "kano",
  "kaduna",
  "katsina",
  "sokoto",
  "kebbi",
  "zamfara",
  "jigawa",
  "bauchi",
  "gombe",
  "yobe",
  "borno",
  "adamawa",
  "taraba",
  "plateau",
  "nassarawa",
  "nasarawa",
  "niger",
  "kwara",
  "kogi",
  "benue",
]);

function norm(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function quoteDelivery(input: {
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): DeliveryQuote {
  const country = (input.country || "NG").trim().toUpperCase();
  if (country && country !== "NG" && country !== "NIGERIA") {
    return {
      shippingMinor: 850_000,
      currency: "NGN",
      zone: "international",
      etaMinDays: 7,
      etaMaxDays: 14,
      label: "International delivery",
    };
  }

  const state = norm(input.state);
  const city = norm(input.city);
  const inLagos =
    LAGOS.has(state) ||
    city.includes("lagos") ||
    city.includes("ikeja") ||
    city.includes("lekki") ||
    city.includes("victoria island") ||
    city.includes("surulere");

  if (inLagos) {
    return {
      shippingMinor: 150_000,
      currency: "NGN",
      zone: "lagos",
      etaMinDays: 1,
      etaMaxDays: 2,
      label: "Lagos metro",
    };
  }
  if (SOUTHWEST.has(state)) {
    return {
      shippingMinor: 250_000,
      currency: "NGN",
      zone: "southwest",
      etaMinDays: 2,
      etaMaxDays: 3,
      label: "South-West",
    };
  }
  if (FCT.has(state) || city.includes("abuja")) {
    return {
      shippingMinor: 300_000,
      currency: "NGN",
      zone: "fct",
      etaMinDays: 2,
      etaMaxDays: 4,
      label: "Abuja / FCT",
    };
  }
  if (SOUTH.has(state)) {
    return {
      shippingMinor: 350_000,
      currency: "NGN",
      zone: "south",
      etaMinDays: 3,
      etaMaxDays: 5,
      label: "South / South-East",
    };
  }
  if (NORTH.has(state)) {
    return {
      shippingMinor: 450_000,
      currency: "NGN",
      zone: "north",
      etaMinDays: 3,
      etaMaxDays: 6,
      label: "Northern Nigeria",
    };
  }

  // Address entered but state unknown — still charge a standard NG rate
  if (state || city) {
    return {
      shippingMinor: 400_000,
      currency: "NGN",
      zone: "nigeria",
      etaMinDays: 3,
      etaMaxDays: 5,
      label: "Nationwide",
    };
  }

  return {
    shippingMinor: 0,
    currency: "NGN",
    zone: "pending",
    etaMinDays: 0,
    etaMaxDays: 0,
    label: "Enter city & state for delivery fee",
  };
}

export function estimateDeliveryDate(
  from: Date,
  quote: Pick<DeliveryQuote, "etaMinDays" | "etaMaxDays">,
): { earliest: Date; latest: Date } {
  const earliest = new Date(from);
  earliest.setHours(18, 0, 0, 0);
  earliest.setDate(earliest.getDate() + Math.max(1, quote.etaMinDays));
  const latest = new Date(from);
  latest.setHours(18, 0, 0, 0);
  latest.setDate(latest.getDate() + Math.max(quote.etaMinDays, quote.etaMaxDays));
  return { earliest, latest };
}

export const NG_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;
