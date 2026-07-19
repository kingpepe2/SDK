import { describe, it, expect, vi } from "vitest";
import {
  KingPepeClient,
  RpcError,
  AuthError,
  HttpError,
  ProtocolError,
  ConnectionError,
  TimeoutError,
  ConfigError,
} from "../src/index.js";
import type { Transport } from "../src/transport.js";

const CREDS = { username: "u", password: "p", network: "regtest" as const };

function mockTransport(impl: Transport) {
  return vi.fn(impl);
}

function ok(result: unknown): Transport {
  return async () => ({ statusCode: 200, body: JSON.stringify({ result, error: null, id: 1 }) });
}

describe("KingPepeClient", () => {
  it("requires credentials", () => {
    expect(() => new KingPepeClient({ network: "regtest" })).toThrow(ConfigError);
  });

  it("returns the RPC result and sends a well-formed request", async () => {
    const transport = mockTransport(ok({ chain: "regtest", blocks: 5 }));
    const client = new KingPepeClient(CREDS, { transport });
    const info = await client.getBlockchainInfo();
    expect(info.chain).toBe("regtest");

    const [config, path, body] = transport.mock.calls[0]!;
    expect(path).toBe("/");
    expect(config.port).toBe(18443); // regtest default
    const parsed = JSON.parse(body);
    expect(parsed.method).toBe("getblockchaininfo");
    expect(parsed.params).toEqual([]);
    expect(typeof parsed.id).toBe("number");
  });

  it("auto-increments request ids", async () => {
    const transport = mockTransport(ok(1));
    const client = new KingPepeClient(CREDS, { transport });
    await client.getBlockCount();
    await client.getBlockCount();
    const id1 = JSON.parse(transport.mock.calls[0]![2]).id;
    const id2 = JSON.parse(transport.mock.calls[1]![2]).id;
    expect(id2).toBe(id1 + 1);
  });

  it("scopes wallet RPC to /wallet/<name>", async () => {
    const transport = mockTransport(ok({ walletname: "w" }));
    const client = new KingPepeClient({ ...CREDS, wallet: "my wallet" }, { transport });
    await client.getWalletInfo();
    expect(transport.mock.calls[0]![1]).toBe("/wallet/my%20wallet");
  });

  it("serializes money amounts as exact decimal strings", async () => {
    const transport = mockTransport(ok("txid"));
    const client = new KingPepeClient(CREDS, { transport });
    await client.sendToAddress("rkpepe1qqypqxpq9qcrsszg2pvxq6rs0zqg3yyc5dtjg0t", 150_000_000n);
    const params = JSON.parse(transport.mock.calls[0]![2]).params;
    expect(params[1]).toBe("1.50000000");
  });

  it("parses a structured JSON-RPC error into RpcError", async () => {
    const transport = mockTransport(async () => ({
      statusCode: 500,
      body: JSON.stringify({ result: null, error: { code: -18, message: "Requested wallet does not exist" }, id: 1 }),
    }));
    const client = new KingPepeClient(CREDS, { transport });
    await expect(client.getWalletInfo()).rejects.toMatchObject({
      name: "RpcError",
      code: -18,
      method: "getwalletinfo",
    } satisfies Partial<RpcError>);
  });

  it("maps 401 to AuthError", async () => {
    const transport = mockTransport(async () => ({ statusCode: 401, body: "" }));
    const client = new KingPepeClient(CREDS, { transport });
    await expect(client.getBlockCount()).rejects.toBeInstanceOf(AuthError);
  });

  it("throws ProtocolError on malformed JSON with 200", async () => {
    const transport = mockTransport(async () => ({ statusCode: 200, body: "<html>not json</html>" }));
    const client = new KingPepeClient(CREDS, { transport });
    await expect(client.getBlockCount()).rejects.toBeInstanceOf(ProtocolError);
  });

  it("throws HttpError on non-2xx with a non-JSON body", async () => {
    const transport = mockTransport(async () => ({ statusCode: 503, body: "Service Unavailable" }));
    const client = new KingPepeClient(CREDS, { transport });
    await expect(client.getBlockCount()).rejects.toBeInstanceOf(HttpError);
  });

  it("propagates transport ConnectionError / TimeoutError", async () => {
    const conn = new KingPepeClient(CREDS, {
      transport: async () => {
        throw new ConnectionError("refused");
      },
    });
    await expect(conn.getBlockCount()).rejects.toBeInstanceOf(ConnectionError);

    const to = new KingPepeClient(CREDS, {
      transport: async () => {
        throw new TimeoutError("timed out");
      },
    });
    await expect(to.getBlockCount()).rejects.toBeInstanceOf(TimeoutError);
  });

  it("healthCheck returns false instead of throwing", async () => {
    const client = new KingPepeClient(CREDS, {
      transport: async () => {
        throw new ConnectionError("down");
      },
    });
    expect(await client.healthCheck()).toBe(false);
  });
});
