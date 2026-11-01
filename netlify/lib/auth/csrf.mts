/**
 * CSRF protection for authenticated administrator requests.
 *
 * The token is **derived**, not stored: `base64url(HMAC-SHA256(SESSION_SECRET,
 * rawSessionToken))`. That choice means
 *
 *   - no extra column, no extra cookie and no extra round trip;
 *   - the token rotates automatically with the session, because a rotated
 *     session token produces a different HMAC — every previously issued form
 *     token dies at the same moment the session does;
 *   - an attacker who can read the session cookie can also compute the token,
 *     which is acceptable: a cookie-reading attacker is already past the
 *     boundary this control exists to defend (threat T7).
 *
 * The HMAC covers only the session token, so two administrators, or two
 * sessions of the same administrator, never share a CSRF token.
 *
 * `SESSION_SECRET` is supplied by the environment, never defaulted; see
 * `config.mts`, which refuses to resolve a configuration without it.
 */

import { constantTimeEquals, hmacSha256Base64Url } from "./crypto.mts";

/** Length of the base64url-encoded HMAC-SHA256 digest. */
export const CSRF_TOKEN_LENGTH = 43;

/** Exact shape of a well-formed CSRF token. */
const CSRF_TOKEN_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${CSRF_TOKEN_LENGTH}}$`);

/** Derives the CSRF token for a session. Never persisted. */
export function deriveCsrfToken(sessionSecret: string, rawSessionToken: string): string {
    return hmacSha256Base64Url(sessionSecret, rawSessionToken);
}

/**
 * True when a submitted value is shaped like a CSRF token.
 *
 * Checked before any comparison so that a wildly malformed header is rejected
 * without touching the HMAC output, and so the length used by
 * `constantTimeEquals` is always known.
 */
export function isWellFormedCsrfToken(value: unknown): value is string {
    return typeof value === "string" && CSRF_TOKEN_PATTERN.test(value);
}

/**
 * Compares a submitted token with the expected one in constant time.
 *
 * Returns `false` for a missing, malformed or mismatched value. Callers
 * distinguish "missing" from "invalid" for the response code only; neither
 * reveals anything about the session.
 */
export function verifyCsrfToken(expected: string, submitted: unknown): boolean {
    if (!isWellFormedCsrfToken(submitted)) {
        return false;
    }

    return constantTimeEquals(expected, submitted);
}
