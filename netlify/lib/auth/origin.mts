/**
 * Origin and transport validation for browser-facing authentication requests.
 *
 * Origin checking answers a different question from CSRF checking, and both are
 * applied where the design calls for them:
 *
 *   - **Origin** stops a request that a *browser* would have had to attach a
 *     cross-site `Origin` header to. It is the primary control for endpoints
 *     that cannot carry a CSRF token (login, provisioning).
 *   - **CSRF** proves that the caller already holds the session token. It is
 *     required on authenticated mutations (logout and every future admin
 *     mutation).
 *
 * Matching is exact: both sides are parsed with the WHATWG URL parser and the
 * resulting `origin` strings are compared with `===`. Substring and prefix
 * tests are never used, so `https://evil-example.com` cannot match
 * `https://example.com`, and `https://example.com.evil.test` cannot either.
 */

import type { AuthConfig } from "./config.mts";
import { HttpError } from "./http.mts";

/** Whether the request carried an Origin header. */
export type OriginSource = "origin" | "none";

/** Result of extracting the calling origin. */
export interface RequestOrigin {
    readonly origin: string | null;
    readonly source: OriginSource;
}

/**
 * Parses a candidate origin, returning a normalised `scheme://host[:port]`.
 *
 * Returns `null` for a missing, malformed, relative or non-HTTP value, which
 * the caller treats exactly like a mismatch.
 */
export function parseOrigin(value: string | null | undefined): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
        return null;
    }

    let parsed: URL;

    try {
        parsed = new URL(trimmed);
    } catch {
        return null;
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return null;
    }

    if (
        parsed.username.length > 0 ||
        parsed.password.length > 0 ||
        parsed.pathname !== "/" ||
        parsed.search.length > 0 ||
        parsed.hash.length > 0
    ) {
        return null;
    }

    return parsed.origin;
}

/** Reads only the Origin header; Referer is not an allowed substitute. */
export function readRequestOrigin(request: Request): RequestOrigin {
    const originHeader = request.headers.get("origin");

    if (originHeader !== null && originHeader.trim().length > 0) {
        return { origin: parseOrigin(originHeader), source: "origin" };
    }

    return { origin: null, source: "none" };
}

/**
 * Asserts that the request came from the configured canonical origin.
 *
 * @throws {HttpError} `403 origin_missing` when `Origin` is absent, and
 *   `403 origin_invalid` when the value is malformed or does not match
 *   `SITE_ORIGIN` exactly.
 */
export function assertTrustedOrigin(request: Request, config: AuthConfig): void {
    // Fetch Metadata (defence in depth). Sent by current browsers on every
    // request; when it says the request is cross-site the origin check below
    // would reject it anyway, but failing fast keeps the rejection obvious.
    const fetchSite = request.headers.get("sec-fetch-site");

    if (fetchSite !== null && fetchSite.toLowerCase() === "cross-site") {
        throw new HttpError(
            403,
            "origin_invalid",
            "This request did not come from the portfolio site.",
        );
    }

    const { origin, source } = readRequestOrigin(request);

    if (source === "none" || origin === null) {
        throw new HttpError(
            403,
            "origin_missing",
            "This request is missing its origin. Reload the page and try again.",
        );
    }

    if (origin !== config.siteOrigin) {
        throw new HttpError(
            403,
            "origin_invalid",
            "This request did not come from the portfolio site.",
        );
    }
}

/**
 * Asserts that the request arrived over HTTPS.
 *
 * Netlify terminates TLS at the edge and forwards the original public URL, so
 * `request.url` is the authoritative scheme. In development the check is
 * skipped, because `SITE_ORIGIN` is plain HTTP on `localhost` by design.
 *
 * @throws {HttpError} `403 https_required` in production over a non-HTTPS URL.
 */
export function assertSecureTransport(request: Request, config: AuthConfig): void {
    if (!config.isProduction) {
        return;
    }

    let protocol: string;

    try {
        protocol = new URL(request.url).protocol;
    } catch {
        throw new HttpError(403, "https_required", "This request must use HTTPS.");
    }

    if (protocol !== "https:") {
        throw new HttpError(403, "https_required", "This request must use HTTPS.");
    }
}
