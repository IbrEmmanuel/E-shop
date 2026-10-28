/**
 * Server-side bank / fintech transfer verification.
 * Used by admin confirm — never trust client-only “I paid” signals.
 */

export type TransferVerificationInput = {
  expectedAmountMinor: number;
  expectedCurrency: string;
  orderTotalMinor: number;
  reportedTransferRef?: string | null;
  verifiedAmountMinor: number;
  verifiedCurrency: string;
  verifiedTransferRef: string;
};

export type TransferVerificationResult =
  | { ok: true; reference: string }
  | { ok: false; mismatches: string[] };

export function verifyBankTransferOnServer(
  input: TransferVerificationInput,
): TransferVerificationResult {
  const mismatches: string[] = [];
  const currency = input.verifiedCurrency.toUpperCase();
  const expectedCurrency = input.expectedCurrency.toUpperCase();
  const ref = input.verifiedTransferRef.trim();
  const reported = (input.reportedTransferRef || "").trim();

  if (input.verifiedAmountMinor !== input.expectedAmountMinor) {
    mismatches.push(
      `amount ${input.verifiedAmountMinor} != expected ${input.expectedAmountMinor}`,
    );
  }
  if (currency !== expectedCurrency) {
    mismatches.push(`currency ${currency} != expected ${expectedCurrency}`);
  }
  if (input.expectedAmountMinor !== input.orderTotalMinor) {
    mismatches.push(
      `payment ${input.expectedAmountMinor} != order total ${input.orderTotalMinor}`,
    );
  }
  if (!ref) {
    mismatches.push("missing transfer reference");
  } else if (reported && ref !== reported) {
    mismatches.push(`reference "${ref}" != reported "${reported}"`);
  }

  if (mismatches.length > 0) return { ok: false, mismatches };
  return { ok: true, reference: ref };
}
