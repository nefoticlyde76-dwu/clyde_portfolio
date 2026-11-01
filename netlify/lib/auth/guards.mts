/**
 * Reusable request guards for administrator endpoints.
 *
 * Every admin handler — the four in this phase and the portfolio CRUD endpoints
 * that follow — composes the same three checks:
 *
 *     requireOrigin(request, config)            // browser-facing requests
 *     const session = await requireAdminSession(request, config)
 *     requireCsrf(request, config, session)     // mutations only
 *
 * Each guard throws an `HttpError`, which the handler's wrapper converts into a
 * response. That means an authorisation decision cannot be accidentally
 * skipped by forgetting a branch: the handler body only runs after the guards
 * have returned.
 *
 * The identity behind a request is resolved *only* from the server-side session
 * row. No role, id or email is ever read from the request (threat T16).
 */

import type { Context } from "@netlify/functions";

import { withTransaction } from "../database.mts";

import type { AuthConfig } from "./config.mts";
import { AuthConfigurationError, CSRF_HEADER_NAME, getAuthConfig } from "./config.mts";
import { deriveCsrfToken, verifyCsrfToken } from "./csrf.mts";
import { HttpError, readCookieValue } from "./http.mts";
import { assertTrustedOrigin } from "./origin.mts";
import { isSessionTokenShaped, resolveSession, type AuthenticatedSession } from "./sessions.mts";

/** Placeholder used when the platform reports no client address. */
export const UNKNOWN_CLIENT_IP = "unknown";

/**
 * Resolves the authentication configuration, failing closed on misconfiguration.
 *
 * A missing `SESSION_SECRET`, a weak secret or an absent `SITE_ORIGIN` is an
 * operator error, not a client error, so the endpoint reports `503` rather than
 * silently degrading — the alternative would be to serve authentication with a
 * weaker guarantee than the design promises.
 *
 * @throws {HttpError} `503 service_unavailable` when configuration is unusable.
 */
export function loadAuthConfig(): AuthConfig {
    try {
        return getAuthConfig();
    } catch (error) {
        if (error instanceof AuthConfigurationError) {
            throw new HttpError(
                503,
                "service_unavailable",
                "Administrator sign-in is temporarily unavailable.",
            );
        }

        throw error;
    }
}

/**
 * Reads the client IP from Netlify's function context.
 *
 * Netlify populates `context.ip` from the connection it terminated, after its
 * own proxy has been applied. Forwarding headers (`X-Forwarded-For`,
 * `X-Real-IP`, `Forwarded`, …) are attacker-controlled on every hop the
 * platform does not own, so they are deliberately not read here — accepting
 * them would let a single caller manufacture unlimited throttle buckets.
 *
 * @param context The Netlify function context, not the request.
 */
export function readClientIp(context: Context): string {
    const ip = context.ip;

    return typeof ip === "string" && ip.length > 0 ? ip : UNKNOWN_CLIENT_IP;
}

/** Rejects non-POST requests with the standard `405` response. */
export function assertMethod(request: Request, allowed: readonly string[]): void {
    if (!allowed.includes(request.method)) {
        throw new HttpError(
            405,
            "method_not_allowed",
            `Use ${allowed.join(" or ")} for this endpoint.`,
            { Allow: allowed.join(", ") },
        );
    }
}

/** Returns the session token carried by the request, or `null`. */
export function readSessionToken(request: Request, config: AuthConfig): string | null {
    const value = readCookieValue(request, config.sessionCookieName);

    if (value === null || !isSessionTokenShaped(value)) {
        return null;
    }

    return value;
}

/**
 * Resolves and validates the session behind a request.
 *
 * @throws {HttpError} `401 unauthenticated` when the cookie is absent,
 *   malformed, unknown, revoked, absolutely expired or idle-expired.
 */
export async function requireAdminSession(
    request: Request,
    config: AuthConfig,
): Promise<AuthenticatedSession> {
    const rawToken = readSessionToken(request, config);

    if (rawToken === null) {
        throw new HttpError(401, "unauthenticated", "Sign in to continue.");
    }

    const session = await withTransaction((client) => resolveSession(client, rawToken, config));

    if (session === null) {
        throw new HttpError(401, "unauthenticated", "Your session has ended. Sign in again.");
    }

    return session;
}

/** {@link assertTrustedOrigin} re-exported under its guard name. */
export function requireOrigin(request: Request, config: AuthConfig): void {
    assertTrustedOrigin(request, config);
}

/** Reads the CSRF token from the agreed header. Never from the URL. */
export function readCsrfHeader(request: Request): string | null {
    return request.headers.get(CSRF_HEADER_NAME);
}

/**
 * Verifies the CSRF token for an authenticated state-changing request.
 *
 * @throws {HttpError} `403 csrf_missing` when the header is absent, and
 *   `403 csrf_invalid` when it is malformed or does not match the token derived
 *   from this session.
 */
export function requireCsrf(
    request: Request,
    config: AuthConfig,
    session: AuthenticatedSession,
): void {
    const submitted = readCsrfHeader(request);

    if (submitted === null || submitted.length === 0) {
        throw new HttpError(
            403,
            "csrf_missing",
            "This request is missing its security token. Reload the page and try again.",
        );
    }

    const expected = deriveCsrfToken(config.sessionSecret, session.rawToken);

    if (!verifyCsrfToken(expected, submitted)) {
        throw new HttpError(
            403,
            "csrf_invalid",
            "This request could not be verified. Reload the page and try again.",
        );
    }
}
