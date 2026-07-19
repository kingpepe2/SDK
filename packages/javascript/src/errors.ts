// Copyright (c) 2026 The KingPepe developers
// Distributed under the MIT software license, see the accompanying LICENSE file.

/** Base class for all errors thrown by the KingPepe SDK. */
export class KingPepeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    // Maintain a proper prototype chain when targeting ES5/CJS.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Invalid SDK usage or invalid input (amounts, addresses, URIs, config). */
export class ValidationError extends KingPepeError {}

/** Configuration is missing or invalid (e.g. no credentials). */
export class ConfigError extends KingPepeError {}

/** The network request failed (DNS, connection refused, TLS, socket error). */
export class ConnectionError extends KingPepeError {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
  }
}

/** The request exceeded the configured timeout or was aborted. */
export class TimeoutError extends KingPepeError {}

/** HTTP-level failure (non-2xx that is not a structured JSON-RPC error). */
export class HttpError extends KingPepeError {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

/** Authentication failed (HTTP 401 or equivalent). */
export class AuthError extends HttpError {}

/** A structured JSON-RPC error returned by the node. */
export class RpcError extends KingPepeError {
  constructor(
    message: string,
    public readonly code: number,
    public readonly method: string,
    public readonly data?: unknown,
  ) {
    super(message);
  }
}

/** The response body was not valid JSON-RPC. */
export class ProtocolError extends KingPepeError {}
