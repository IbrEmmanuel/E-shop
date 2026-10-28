/**
 * Checkout payment-method catalog matching the architecture flowchart:
 * choose method → OPay / UBA / other banks → server-side verification.
 *
 * Live PSP APIs (Paystack etc.) remain optional; default commerce path is
 * settlement-account transfer + admin/server verification of proof.
 */

export type PaymentMethodId = "opay" | "uba" | "bank" | "other_wallet";

export type PaymentMethod = {
  id: PaymentMethodId;
  label: string;
  description: string;
  /** Settlement account id preferred for this rail */
  preferredAccountId: "opay" | "uba" | null;
  apps: string[];
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "opay",
    label: "OPay",
    description: "Transfer from OPay wallet to our OPay settlement account.",
    preferredAccountId: "opay",
    apps: ["OPay"],
  },
  {
    id: "uba",
    label: "UBA",
    description: "Transfer from UBA or any bank into our UBA account.",
    preferredAccountId: "uba",
    apps: ["UBA", "GTBank", "Access Bank", "Zenith", "First Bank"],
  },
  {
    id: "other_wallet",
    label: "Moniepoint / PalmPay / Kuda",
    description: "Send from supported wallets into UBA or OPay settlement.",
    preferredAccountId: "uba",
    apps: ["Moniepoint", "PalmPay", "Kuda"],
  },
  {
    id: "bank",
    label: "Other supported banks",
    description: "Any Nigerian bank transfer with the order narration.",
    preferredAccountId: "uba",
    apps: ["Other bank"],
  },
];

export function paymentMethodById(id: string): PaymentMethod | undefined {
  return PAYMENT_METHODS.find((m) => m.id === id);
}
