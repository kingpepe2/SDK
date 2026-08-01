import { describe, expect, it } from "vitest";
import {
  KingPepeClient,
  KingPepeRpcError,
  KingPepeSecurityError,
  KingPepeTimeoutError,
  KingPepeValidationError,
  KingPepeHttpError,
} from "../src/index.js";
import type { FetchLike } from "../src/index.js";

/** Build a fake fetch that records the last request and returns a JSON-RPC result. */
function mockFetch(result: unknown) {
  const calls: Array<{ url: string; init: any }> = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ result, error: null, id: 1 }),
    };
  };
  return { fetch, calls };
}

function client(fetch: FetchLike, extra: Record<string, unknown> = {}) {
  return new KingPepeClient({
    url: "https://node.example:24027/",
    username: "rpcuser",
    password: "s3cr3t",
    fetch,
    ...extra,
  });
}

describe("node methods", () => {
  it("getBlockchainInfo issues the correct RPC method", async () => {
    const { fetch, calls } = mockFetch({ chain: "main", blocks: 42 });
    const info = await client(fetch).getBlockchainInfo();
    expect(info.chain).toBe("main");
    const body = JSON.parse(calls[0]!.init.body);
    expect(body.method).toBe("getblockchaininfo");
    expect(body.params).toEqual([]);
  });

  it("getBlockHash validates the height", async () => {
    const { fetch } = mockFetch("abc");
    await expect(client(fetch).getBlockHash(-1 as number)).rejects.toBeInstanceOf(
      KingPepeValidationError,
    );
  });

  it("getBlock passes verbosity", async () => {
    const { fetch, calls } = mockFetch({ hash: "x", height: 1 });
    await client(fetch).getBlock("0".repeat(64), 2);
    const body = JSON.parse(calls[0]!.init.body);
    expect(body.params).toEqual(["0".repeat(64), 2]);
  });

  it("getRawTransaction rejects a non-hash txid", async () => {
    const { fetch } = mockFetch("hex");
    await expect(client(fetch).getRawTransaction("not-a-hash", false)).rejects.toBeInstanceOf(
      KingPepeValidationError,
    );
  });
});

describe("security", () => {
  it("never places credentials anywhere but the Authorization header", async () => {
    const { fetch, calls } = mockFetch({ blocks: 1 });
    await client(fetch).getBlockCount();
    const { url, init } = calls[0]!;
    expect(url).not.toContain("s3cr3t");
    expect(init.body).not.toContain("s3cr3t");
    expect(init.headers.authorization).toMatch(/^Basic /);
    // The secret must not be readable in plaintext in the header.
    expect(init.headers.authorization).not.toContain("s3cr3t");
  });

  it("guards fund-moving methods unless explicitly enabled", async () => {
    const { fetch } = mockFetch("txid");
    await expect(
      client(fetch).sendToAddress("kpepe1qexample", 1.5),
    ).rejects.toBeInstanceOf(KingPepeSecurityError);
  });

  it("allows guarded methods when enableWalletWrites is true", async () => {
    const { fetch, calls } = mockFetch("thetxid");
    const txid = await client(fetch, { enableWalletWrites: true }).sendToAddress(
      "kpepe1qexample",
      1.5,
    );
    expect(txid).toBe("thetxid");
    const body = JSON.parse(calls[0]!.init.body);
    expect(body.method).toBe("sendtoaddress");
  });

  it("rejects a non-positive send amount", async () => {
    const { fetch } = mockFetch("txid");
    await expect(
      client(fetch, { enableWalletWrites: true }).sendToAddress("kpepe1q", 0),
    ).rejects.toBeInstanceOf(KingPepeValidationError);
  });

  it("reports HTTPS endpoints as secure", () => {
    const { fetch } = mockFetch({});
    expect(client(fetch).isSecureEndpoint).toBe(true);
  });
});

describe("errors", () => {
  it("maps a JSON-RPC error to KingPepeRpcError", async () => {
    const fetch: FetchLike = async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ result: null, error: { code: -8, message: "bad" } }),
    });
    await expect(client(fetch).getBlockCount()).rejects.toMatchObject({
      name: "KingPepeRpcError",
      code: -8,
    });
    await expect(client(fetch).getBlockCount()).rejects.toBeInstanceOf(KingPepeRpcError);
  });

  it("maps a non-2xx without a JSON-RPC body to KingPepeHttpError", async () => {
    const fetch: FetchLike = async () => ({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "",
    });
    await expect(client(fetch).getBlockCount()).rejects.toBeInstanceOf(KingPepeHttpError);
  });

  it("aborts and throws KingPepeTimeoutError on timeout", async () => {
    const fetch: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const e = new Error("aborted");
          e.name = "AbortError";
          reject(e);
        });
      });
    await expect(client(fetch, { timeoutMs: 20 }).getBlockCount()).rejects.toBeInstanceOf(
      KingPepeTimeoutError,
    );
  });
});
