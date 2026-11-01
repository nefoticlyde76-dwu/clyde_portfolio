/**
 * Cryptographic primitives shared by the authentication modules.
 *
 * Only Node core (`node:crypto`) is used here. Nothing in this module logs,
 * returns or throws values derived from a secret.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Number of random bytes in every opaque token issued by this system. */
export const TOKEN_BYTES = 32;

/** Length of the base64url encoding of `TOKEN_BYTES`. */
export const TOKEN_LENGTH = 43;

/** Length of a SHA-256 digest rendered as lowercase hexadecimal. */
export const SHA256_HEX_LENGTH = 64;

/** Encodes a buffer as unpadded base64url. */
export function base64UrlFromBuffer(buffer: Buffer): string {
    return buffer.toString("base64url");
}

/**
 * Generates a cryptographically secure opaque token.
 *
 * 32 random bytes = 256 bits of entropy, encoded as 43 base64url characters.
 */
export function randomToken(byteLength: number = TOKEN_BYTES): string {
    return base64UrlFromBuffer(randomBytes(byteLength));
}

/** Lowercase hexadecimal SHA-256 digest of a UTF-8 string. */
export function sha256Hex(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * HMAC-SHA256 rendered as unpadded base64url.
 *
 * Used to derive the CSRF token from the session token so that nothing extra
 * has to be persisted.
 */
export function hmacSha256Base64Url(key: string, message: string): string {
    return base64UrlFromBuffer(createHmac("sha256", key).update(message, "utf8").digest());
}

/**
 * Constant-time comparison of two arbitrary strings.
 *
 * Both operands are reduced to fixed-length SHA-256 digests before the
 * comparison, so the result never depends on — and never reveals — the length
 * of either input.
 */
export function constantTimeEquals(left: string, right: string): boolean {
    const leftDigest = createHash("sha256").update(left, "utf8").digest();
    const rightDigest = createHash("sha256").update(right, "utf8").digest();

    return timingSafeEqual(leftDigest, rightDigest);
}
