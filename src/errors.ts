/**
 * Error hierarchy for the KingPepe SDK.
 *
 * No error message in this module ever includes RPC credentials (username,
 * password, or Authorization header). Callers may safely log these errors.
 */

/** Base class for every error thrown by the SDK. */
export class KingPepeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KingPepeError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** A JSON-RPC error object returned by the KingPepe node (`{code, message}`). */
export class KingPepeRpcError extends KingPepeError {
  readonly code: number;
  readonly data: unknown;
  readonly method: string;

  constructor(method: string, code: number, message: string, data?: unknown) {
    super(`RPC error ${code} from '${method}': ${message}`);
    this.name = "KingPepeRpcError";
    this.code = code;
    this.data = data;
    this.method = method;
  }
}

/** A non-2xx HTTP response from the RPC endpoint. */
export class KingPepeHttpError extends KingPepeError {
  readonly status: number;

  constructor(status: number, statusText: string) {
    super(`HTTP ${status} ${statusText} from RPC endpoint`);
    this.name = "KingPepeHttpError";
    this.status = status;
  }
}

/** The request exceeded the configured timeout and was aborted. */
export class KingPepeTimeoutError extends KingPepeError {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`RPC request timed out after ${timeoutMs} ms`);
    this.name = "KingPepeTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/** Client-side input validation failed before any request was sent. */
export class KingPepeValidationError extends KingPepeError {
  constructor(message: string) {
    super(message);
    this.name = "KingPepeValidationError";
  }
}

/** A guarded, fund-moving or secret-handling method was called without opt-in. */
export class KingPepeSecurityError extends KingPepeError {
  constructor(message: string) {
    super(message);
    this.name = "KingPepeSecurityError";
  }
}

/** The transport failed (network error, DNS, connection refused, etc.). */
export class KingPepeTransportError extends KingPepeError {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "KingPepeTransportError";
    this.cause = cause;
  }
}
