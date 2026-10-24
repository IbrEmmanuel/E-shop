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
  const cleaned = input.replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid money format: ${input}`);
  }
  const [whole, frac = ""] = cleaned.split(".");
  const fracPadded = (frac + "00").slice(0, 2);
  const sign = whole.startsWith("-") ? -1 : 1;
  const absWhole = whole.replace("-", "");
  return sign * (parseInt(absWhole, 10) * 100 + parseInt(fracPadded, 10));
}

export function assertNonNegativeMinor(amount: number, label = "amount"): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`${label} must be a non-negative integer in minor units`);
  }
}
