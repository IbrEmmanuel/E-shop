/**
 * Platform commission on vendor sale subtotals (item value, not shipping).
 * Default vendor.commissionBps is 1000 = 10.00% unless overridden per vendor.
 */
export function commissionFromGross(opts: {
  grossMinor: number;
  commissionBps: number;
}): { commissionMinor: number; vendorNetMinor: number } {
  const bps = Math.max(0, Math.min(10_000, Math.floor(opts.commissionBps)));
  const gross = Math.max(0, Math.floor(opts.grossMinor));
  const commissionMinor = Math.floor((gross * bps) / 10_000);
  const vendorNetMinor = Math.max(0, gross - commissionMinor);
  return { commissionMinor, vendorNetMinor };
}

export function formatCommissionPct(commissionBps: number): string {
  return `${(commissionBps / 100).toFixed(1)}%`;
}
