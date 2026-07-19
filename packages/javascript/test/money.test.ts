import { describe, it, expect } from "vitest";
import {
  parseKpepe,
  formatKpepe,
  validateAmount,
  rpcAmountToBaseUnits,
  ValidationError,
} from "../src/index.js";

describe("money", () => {
  it("parses whole and fractional amounts to base units", () => {
    expect(parseKpepe("0")).toBe(0n);
    expect(parseKpepe("1")).toBe(100_000_000n);
    expect(parseKpepe("1.23456789")).toBe(123_456_789n);
    expect(parseKpepe("0.00000001")).toBe(1n);
  });

  it("formats base units to fixed 8-decimal strings", () => {
    expect(formatKpepe(0n)).toBe("0.00000000");
    expect(formatKpepe(1n)).toBe("0.00000001");
    expect(formatKpepe(123_456_789n)).toBe("1.23456789");
    expect(formatKpepe(100_000_000n)).toBe("1.00000000");
  });

  it("round-trips parse/format", () => {
    for (const s of ["0.00000000", "12.34567890", "20999999.99999999"]) {
      expect(formatKpepe(parseKpepe(s))).toBe(s);
    }
  });

  it("rejects floats passed as numbers", () => {
    // @ts-expect-error deliberately passing a number
    expect(() => parseKpepe(1.23)).toThrow(ValidationError);
  });

  it("rejects too many decimals", () => {
    expect(() => parseKpepe("1.123456789")).toThrow(ValidationError);
  });

  it("rejects malformed and out-of-range amounts", () => {
    expect(() => parseKpepe("abc")).toThrow(ValidationError);
    expect(() => parseKpepe("1e8")).toThrow(ValidationError);
    expect(() => parseKpepe("21000000.00000001")).toThrow(ValidationError);
  });

  it("validateAmount rejects negatives", () => {
    expect(() => validateAmount("-1")).toThrow(ValidationError);
    expect(validateAmount("1.5")).toBe(150_000_000n);
    expect(validateAmount(150_000_000n)).toBe(150_000_000n);
  });

  it("converts Core float RPC amounts to exact base units", () => {
    expect(rpcAmountToBaseUnits(1.23)).toBe(123_000_000n);
    expect(rpcAmountToBaseUnits(0.00000001)).toBe(1n);
    expect(rpcAmountToBaseUnits(20999999.99999999)).toBe(2_099_999_999_999_999n);
  });
});
