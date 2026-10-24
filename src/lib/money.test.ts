import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, parseMoneyToMinor } from "./money";

describe("money", () => {
  it("parses decimal strings to minor units", () => {
    assert.equal(parseMoneyToMinor("15.00"), 1500);
    assert.equal(parseMoneyToMinor("129.99"), 12999);
    assert.equal(parseMoneyToMinor(10), 1000);
  });

  it("rejects invalid money formats", () => {
    assert.throws(() => parseMoneyToMinor("12.999"));
    assert.throws(() => parseMoneyToMinor("abc"));
  });

  it("formats NGN amounts", () => {
    const out = formatMoney(1500000, "NGN");
    assert.match(out, /15/);
  });
});
