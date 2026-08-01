import { KingPepeValidationError } from "./errors.js";

/** Assert a value is a non-empty string. */
export function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new KingPepeValidationError(`${name} must be a non-empty string`);
  }
  return value;
}

/** Assert a value is a safe, non-negative integer. */
export function requireUInt(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new KingPepeValidationError(`${name} must be a non-negative integer`);
  }
  return value;
}

/** Assert a value is a finite number. */
export function requireNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new KingPepeValidationError(`${name} must be a finite number`);
  }
  return value;
}

/** Assert a value is a finite number strictly greater than zero. */
export function requirePositive(value: unknown, name: string): number {
  const n = requireNumber(value, name);
  if (n <= 0) {
    throw new KingPepeValidationError(`${name} must be greater than zero`);
  }
  return n;
}

/** Assert a string looks like a 64-hex-character transaction id / block hash. */
export function requireHash(value: unknown, name: string): string {
  const s = requireString(value, name);
  if (!/^[0-9a-fA-F]{64}$/.test(s)) {
    throw new KingPepeValidationError(`${name} must be a 64-character hex hash`);
  }
  return s;
}

/** Assert a string is non-empty hex (used for raw tx / block hex payloads). */
export function requireHex(value: unknown, name: string): string {
  const s = requireString(value, name);
  if (!/^[0-9a-fA-F]+$/.test(s) || s.length % 2 !== 0) {
    throw new KingPepeValidationError(`${name} must be an even-length hex string`);
  }
  return s;
}
