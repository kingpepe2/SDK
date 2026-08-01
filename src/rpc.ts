import {
  KingPepeHttpError,
  KingPepeRpcError,
  KingPepeTimeoutError,
  KingPepeTransportError,
} from "./errors.js";

/** A minimal fetch signature so the SDK works in Node and the browser. */
export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
}>;

export interface RpcTransportOptions {
  /** Full RPC endpoint URL, e.g. "https://node.example:24027/" or with a wallet path. */
  url: string;
  /** RPC username (kept only in memory; never logged). */
  username?: string;
  /** RPC password (kept only in memory; never logged). */
  password?: string;
  /** Per-request timeout in milliseconds (default 30000). */
  timeoutMs?: number;
  /** Extra headers merged into every request (never logged). */
  headers?: Record<string, string>;
  /** Custom fetch implementation (defaults to the global `fetch`). */
  fetch?: FetchLike;
}

// Base64 that works in both Node and the browser without importing anything.
function toBase64(input: string): string {
  const g = globalThis as unknown as {
    btoa?: (s: string) => string;
    Buffer?: { from(s: string, enc: string): { toString(enc: string): string } };
  };
  if (typeof g.btoa === "function") {
    // Browser: encode UTF-8 safely.
    return g.btoa(unescape(encodeURIComponent(input)));
  }
  if (g.Buffer) {
    return g.Buffer.from(input, "utf-8").toString("base64");
  }
  throw new KingPepeTransportError("No base64 encoder available in this runtime");
}

let requestId = 0;

/**
 * Low-level JSON-RPC 1.0/2.0 transport over HTTP(S).
 *
 * Credentials are only ever placed in the outgoing `Authorization` header.
 * They are never written to logs, error messages, or thrown objects.
 */
export class RpcTransport {
  private readonly url: string;
  private readonly authHeader?: string;
  private readonly timeoutMs: number;
  private readonly extraHeaders: Record<string, string>;
  private readonly doFetch: FetchLike;

  constructor(options: RpcTransportOptions) {
    if (!options || typeof options.url !== "string" || options.url.length === 0) {
      throw new KingPepeTransportError("An RPC `url` is required");
    }
    this.url = options.url;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.extraHeaders = { ...(options.headers ?? {}) };
    if (options.username !== undefined || options.password !== undefined) {
      const user = options.username ?? "";
      const pass = options.password ?? "";
      this.authHeader = `Basic ${toBase64(`${user}:${pass}`)}`;
    }
    const f = options.fetch ?? (globalThis as { fetch?: FetchLike }).fetch;
    if (typeof f !== "function") {
      throw new KingPepeTransportError(
        "No `fetch` available; pass options.fetch on this runtime",
      );
    }
    this.doFetch = f;
  }

  /** Whether this endpoint uses HTTPS. */
  get isSecure(): boolean {
    return this.url.toLowerCase().startsWith("https:");
  }

  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const id = ++requestId;
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });

    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...this.extraHeaders,
    };
    if (this.authHeader) headers["authorization"] = this.authHeader;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.doFetch(this.url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
    } catch (err) {
      if (isAbortError(err)) throw new KingPepeTimeoutError(this.timeoutMs);
      // Deliberately do not echo request details (which could include headers).
      throw new KingPepeTransportError(`Failed to reach RPC endpoint for '${method}'`, err);
    } finally {
      clearTimeout(timer);
    }

    const raw = await res.text();

    if (!res.ok) {
      // Bitcoin Core returns JSON-RPC errors with non-2xx status codes.
      const parsed = safeParse(raw) as { error?: RpcErrorShape } | undefined;
      const rpcErr = parsed?.error;
      if (rpcErr && typeof rpcErr.code === "number") {
        throw new KingPepeRpcError(method, rpcErr.code, rpcErr.message ?? "", rpcErr.data);
      }
      throw new KingPepeHttpError(res.status, res.statusText);
    }

    const parsed = safeParse(raw);
    if (parsed === undefined) {
      throw new KingPepeTransportError(`Malformed JSON in RPC response for '${method}'`);
    }
    const obj = parsed as { error?: RpcErrorShape | null; result?: T };
    if (obj.error) {
      throw new KingPepeRpcError(method, obj.error.code, obj.error.message ?? "", obj.error.data);
    }
    return obj.result as T;
  }
}

interface RpcErrorShape {
  code: number;
  message?: string;
  data?: unknown;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "AbortError"
  );
}
