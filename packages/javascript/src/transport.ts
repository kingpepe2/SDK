// Copyright (c) 2026 The KingPepe developers
// Distributed under the MIT software license, see the accompanying LICENSE file.

import http from "node:http";
import https from "node:https";
import { ResolvedConfig } from "./config.js";
import { ConnectionError, TimeoutError } from "./errors.js";

export interface TransportResponse {
  statusCode: number;
  body: string;
}

/**
 * A transport sends a raw JSON body to the node's RPC endpoint and returns the
 * raw response. It is injectable so tests can supply a mock without real I/O.
 */
export type Transport = (
  config: ResolvedConfig,
  path: string,
  body: string,
  signal?: AbortSignal,
) => Promise<TransportResponse>;

/** Default transport built on node:http / node:https. */
export const nodeTransport: Transport = (config, path, body, signal) => {
  return new Promise<TransportResponse>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new TimeoutError("Request aborted before it was sent."));
      return;
    }
    const isHttps = config.protocol === "https";
    const agentLib = isHttps ? https : http;
    // Basic auth header is sensitive and is never logged anywhere in the SDK.
    const auth = "Basic " + Buffer.from(`${config.username}:${config.password}`).toString("base64");

    const requestOptions: https.RequestOptions = {
      host: config.host,
      port: config.port,
      method: "POST",
      path,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body).toString(),
        Authorization: auth,
        Connection: "close",
      },
      timeout: config.timeoutMs,
    };
    if (isHttps && config.tls) {
      requestOptions.rejectUnauthorized = config.tls.rejectUnauthorized ?? true;
      if (config.tls.ca) requestOptions.ca = config.tls.ca;
      if (config.tls.cert) requestOptions.cert = config.tls.cert;
      if (config.tls.key) requestOptions.key = config.tls.key;
      if (config.tls.servername) requestOptions.servername = config.tls.servername;
    }

    const req = agentLib.request(requestOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        cleanup();
        resolve({ statusCode: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
      });
    });

    const onAbort = () => {
      req.destroy();
      reject(new TimeoutError("Request aborted."));
    };

    const cleanup = () => {
      if (signal) signal.removeEventListener("abort", onAbort);
    };

    req.on("timeout", () => {
      req.destroy();
      cleanup();
      reject(new TimeoutError(`Request timed out after ${config.timeoutMs} ms.`));
    });
    req.on("error", (err) => {
      cleanup();
      // Never include auth in the error; err.message is a socket-level message.
      reject(new ConnectionError(`RPC transport error: ${err.message}`, err));
    });
    if (signal) signal.addEventListener("abort", onAbort, { once: true });

    req.write(body);
    req.end();
  });
};
