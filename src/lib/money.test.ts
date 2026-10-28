import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, parseMoneyToMinor } from "./money";

describe("money", () => {
  it("parses decimal strings to minor units", () => {
    assert.equal(parseMoneyToMinor("15.00"), 1500);
    assert.equal(parseMoneyToMinor("129.99"), 12999);
    assert.equal(parseMoneyToMinor(10), 1000);
    assert.equal(parseMoneyToMinor("₦5,000"), 500000);
    assert.equal(parseMoneyToMinor("NGN 15000"), 1500000);
    assert.equal(parseMoneyToMinor("15 000.5"), 1500050);
    assert.equal(parseMoneyToMinor("12.999"), 1300);
  });

  it("rejects invalid money formats", () => {
    assert.throws(() => parseMoneyToMinor("abc"));
    assert.throws(() => parseMoneyToMinor(""));
  });

  it("formats NGN amounts", () => {
    const out = formatMoney(1500000, "NGN");
    assert.match(out, /15/);
  });
});
