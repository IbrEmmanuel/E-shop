/** Money helpers — always use integer minor units (kobo/cents). */

export function formatMoney(
  amountMinor: number,
  currency = "NGN",
  locale = "en-NG",
): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

export function parseMoneyToMinor(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("Invalid money amount");
    return Math.round(input * 100);
  }

  // Accept common user input: ₦5,000 / NGN 5000 / 5000.5 / 15 000
  let cleaned = input
    .replace(/₦/g, "")
    .replace(/\bNGN\b/gi, "")
    .replace(/[\s,]/g, "")
    .trim();

  if (cleaned.endsWith(".")) cleaned = cleaned.slice(0, -1);

  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error(`Invalid money format: ${input}`);
  }

  const num = Number(cleaned);
  if (!Number.isFinite(num)) throw new Error(`Invalid money format: ${input}`);
  return Math.round(num * 100);
}

export function assertNonNegativeMinor(amount: number, label = "amount"): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`${label} must be a non-negative integer in minor units`);
  }
}
