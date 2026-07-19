import { describe, it, expect } from "vitest";
import { buildUri, parseUri, ValidationError } from "../src/index.js";

const ADDR = "rkpepe1qqypqxpq9qcrsszg2pvxq6rs0zqg3yyc5dtjg0t";

describe("kingpepe: URI", () => {
  it("builds a URI with amount, label, message", () => {
    const uri = buildUri({
      address: ADDR,
      amountBaseUnits: 150_000_000n,
      label: "Order 42",
      message: "Thanks!",
    });
    expect(uri.startsWith(`kingpepe:${ADDR}?`)).toBe(true);
    expect(uri).toContain("amount=1.5");
    expect(uri).toContain("label=Order+42");
    expect(uri).toContain("message=Thanks%21");
  });

  it("omits the query when there are no params", () => {
    expect(buildUri({ address: ADDR })).toBe(`kingpepe:${ADDR}`);
  });

  it("round-trips build/parse losslessly for the amount", () => {
    const uri = buildUri({ address: ADDR, amountBaseUnits: 123_456_789n, label: "x" });
    const parsed = parseUri(uri);
    expect(parsed.address).toBe(ADDR);
    expect(parsed.amountBaseUnits).toBe(123_456_789n);
    expect(parsed.label).toBe("x");
  });

  it("rejects a bitcoin: URI", () => {
    expect(() => parseUri("bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toThrow(ValidationError);
  });

  it("rejects a URI whose address is not KingPepe", () => {
    expect(() => parseUri("kingpepe:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toThrow(ValidationError);
  });

  it("preserves extra params", () => {
    const parsed = parseUri(`kingpepe:${ADDR}?somex=1`);
    expect(parsed.params).toEqual({ somex: "1" });
  });
});
