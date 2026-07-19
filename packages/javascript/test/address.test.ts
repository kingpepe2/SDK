import { describe, it, expect } from "vitest";
import {
  getNetworkForAddress,
  isBitcoinAddress,
  isValidKingPepeAddressFormat,
  assertKingPepeAddress,
  ValidationError,
} from "../src/index.js";

const MAINNET = "kpepe1qqypqxpq9qcrsszg2pvxq6rs0zqg3yyc5afhcv2";
const TESTNET = "tkpepe1qqypqxpq9qcrsszg2pvxq6rs0zqg3yyc58a74sj";
const REGTEST = "rkpepe1qqypqxpq9qcrsszg2pvxq6rs0zqg3yyc5dtjg0t";
const BITCOIN = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";

describe("address / HRP validation", () => {
  it("detects the KingPepe network from the HRP", () => {
    expect(getNetworkForAddress(MAINNET)).toBe("mainnet");
    expect(getNetworkForAddress(TESTNET)).toBe("testnet");
    expect(getNetworkForAddress(REGTEST)).toBe("regtest");
  });

  it("recognizes a Bitcoin address and never treats it as KingPepe", () => {
    expect(isBitcoinAddress(BITCOIN)).toBe(true);
    expect(getNetworkForAddress(BITCOIN)).toBeUndefined();
    expect(isValidKingPepeAddressFormat(BITCOIN)).toBe(false);
  });

  it("validates format and enforces the requested network", () => {
    expect(isValidKingPepeAddressFormat(MAINNET, "mainnet")).toBe(true);
    expect(isValidKingPepeAddressFormat(MAINNET, "regtest")).toBe(false);
    expect(isValidKingPepeAddressFormat("kpepe1garbage")).toBe(false);
  });

  it("assertKingPepeAddress throws on Bitcoin or invalid input", () => {
    expect(() => assertKingPepeAddress(BITCOIN)).toThrow(ValidationError);
    expect(() => assertKingPepeAddress("not-an-address")).toThrow(ValidationError);
    expect(() => assertKingPepeAddress(REGTEST, "regtest")).not.toThrow();
  });
});
