import type { SettlementAccount } from "@/lib/payments/settlement";

/**
 * Best-effort deep links / intents to open wallet or bank apps with
 * prefilled transfer hints. Falls back to web / copy when unsupported.
 */
export function openPaymentAppLinks(opts: {
  methodId: string;
  account: SettlementAccount;
  amountMinor: number;
  narration: string;
}): { label: string; href: string }[] {
  const amountNaira = (opts.amountMinor / 100).toFixed(2);
  const { account, narration } = opts;
  const links: { label: string; href: string }[] = [];

  if (opts.methodId === "opay" || account.bank === "OPay") {
    // OPay has no public universal transfer deep-link; open store / app home.
    links.push({
      label: "Open OPay",
      href: "https://www.opayweb.com/",
    });
  }

  if (opts.methodId === "uba" || account.bank === "UBA") {
    links.push({
      label: "Open UBA",
      href: "https://www.ubagroup.com/nigeria/personal-banking/ways-to-bank/",
    });
  }

  // Generic bank transfer hint encoded for share sheets
  const share = [
    `Pay ${amountNaira} NGN`,
    `Account: ${account.accountNumber}`,
    `Name: ${account.accountName}`,
    `Bank: ${account.bank}`,
    `Narration: ${narration}`,
  ].join("\n");
  links.push({
    label: "Share payment details",
    href: `sms:?body=${encodeURIComponent(share)}`,
  });

  return links;
}
