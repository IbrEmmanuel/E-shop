/**
 * Merchant settlement accounts for direct bank / fintech-app transfers.
 * Customers choose a payment method (OPay / UBA / other banks), transfer into
 * these accounts, then admin confirms via server-side verification.
 *
 * @see PAYMENT_METHODS in ./methods.ts
 */

export type SettlementAccount = {
  id: string;
  bank: string;
  accountNumber: string;
  accountName: string;
  apps: string[];
  accent: string;
};

export const FINTECH_APPS = [
  "OPay",
  "Moniepoint",
  "PalmPay",
  "Kuda",
  "UBA",
  "GTBank",
  "Access Bank",
  "Zenith",
  "First Bank",
] as const;

export function getSettlementAccounts(): SettlementAccount[] {
  return [
    {
      id: "uba",
      bank: "UBA",
      accountNumber: (
        process.env.SETTLEMENT_UBA_ACCOUNT || "2087806036"
      ).replace(/\s+/g, ""),
      accountName: (
        process.env.SETTLEMENT_UBA_NAME || "Ibrahim Emmanuel Haruna"
      ).trim(),
      apps: ["UBA", "OPay", "Moniepoint", "PalmPay", "Kuda"],
      accent: "#d71a21",
    },
    {
      id: "opay",
      bank: "OPay",
      accountNumber: (
        process.env.SETTLEMENT_OPAY_ACCOUNT || "9139127576"
      ).replace(/\s+/g, ""),
      accountName: (
        process.env.SETTLEMENT_OPAY_NAME || "Emmanuel Ibrahim"
      ).trim(),
      apps: ["OPay", "Moniepoint", "PalmPay", "Kuda"],
      accent: "#1a9f4a",
    },
  ].filter((a) => a.accountNumber.length >= 10);
}

export function bankTransferAvailable(): boolean {
  return getSettlementAccounts().length > 0;
}

/** Narration customers should paste when transferring. */
export function transferNarration(orderNumber: string): string {
  return orderNumber;
}
