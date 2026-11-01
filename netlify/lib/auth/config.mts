/**
 * Authentication configuration, resolved from the server environment.
 *
 * Fail-closed rules (Phase 3A §5.3, §6.2, §8.3):
 *   - `SESSION_SECRET` is always required and must carry >= 32 bytes of material.
 *   - `SITE_ORIGIN` is always required outside development.
 *   - `ADMIN_SETUP_TOKEN`, when present, must also carry >= 32 bytes.
 *   - Only the explicit value `APP_ENV=development` relaxes transport security.
 *     Any other value — including an unset variable — is treated as production.
 *
 * The configuration is resolved on every call rather than cached, because the
 * values are read once per invocation from `process.env`, which Netlify injects
 * into the function runtime.
 */

/** Raised when required authentication configuration is missing or unusable. */
export class AuthConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AuthConfigurationError";
    }
}

/** Minimum entropy (in bytes) for `SESSION_SECRET` and `ADMIN_SETUP_TOKEN`. */
export const MINIMUM_SECRET_BYTES = 32;

/** Absolute session lifetime — 8 hours (Phase 3A §4.2). */
export const SESSION_ABSOLUTE_TTL_MS = 8 * 60 * 60 * 1000;

/** Idle session timeout — 30 minutes (Phase 3A §4.2). */
export const SESSION_IDLE_TTL_MS = 30 * 60 * 1000;

/** Rolling window used by the login throttle — 15 minutes (Phase 3A §7). */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Maximum failed sign-ins from a single IP within the window. */
export const MAX_FAILURES_PER_IP = 5;

/** Maximum failed sign-ins for a single submitted login identifier. */
export const MAX_FAILURES_PER_IDENTITY = 10;

/** Login-attempt records older than this are swept on every attempt. */
export const ATTEMPT_RETENTION_MS = 24 * 60 * 60 * 1000;

/** Production cookie name. The `__Host-` prefix forbids `Domain` and forces `Secure`. */
export const PRODUCTION_SESSION_COOKIE = "__Host-clyde_admin_session";

/** Development cookie name. `__Host-` cannot be set over plain HTTP. */
export const DEVELOPMENT_SESSION_COOKIE = "clyde_admin_session";

/** Header carrying the CSRF token for JSON requests. */
export const CSRF_HEADER_NAME = "x-csrf-token";

/** Fallback canonical origin for local development only. */
export const DEVELOPMENT_SITE_ORIGIN = "http://localhost:8888";

export interface AuthConfig {
    /** Raw `APP_ENV` value, for diagnostics only. */
    readonly appEnv: string;
    /** True only when `APP_ENV` is exactly `development`. */
    readonly isDevelopment: boolean;
    /** True unless `isDevelopment`. */
    readonly isProduction: boolean;
    /** HMAC key for CSRF token derivation. Never logged. */
    readonly sessionSecret: string;
    /** Canonical origin, normalised to `scheme://host[:port]`. */
    readonly siteOrigin: string;
    /** One-time first-administrator secret, or `null` when unset. */
    readonly adminSetupToken: string | null;
    /** `Set-Cookie` name for the session. */
    readonly sessionCookieName: string;
    /** Whether the session cookie carries `Secure`. */
    readonly cookieSecure: boolean;
    readonly sessionAbsoluteTtlMs: number;
    readonly sessionIdleTtlMs: number;
    readonly loginWindowMs: number;
    readonly maxFailuresPerIp: number;
    readonly maxFailuresPerIdentity: number;
    readonly attemptRetentionMs: number;
}

/** Reads `process.env` without throwing when a variable is absent. */
function readEnv(name: string): string | undefined {
    const value = process.env[name];

    return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Asserts that a secret carries at least `MINIMUM_SECRET_BYTES` of material. */
function assertSecretStrength(name: string, value: string): void {
    if (Buffer.byteLength(value, "utf8") < MINIMUM_SECRET_BYTES) {
        throw new AuthConfigurationError(
            `${name} must be at least ${MINIMUM_SECRET_BYTES} bytes of cryptographically ` +
                "random material. Generate one with: node -e \"console.log(" +
                "require('crypto').randomBytes(32).toString('base64url'))\"",
        );
    }
}

/** Normalises an origin value, rejecting anything that is not a bare origin. */
function normaliseOrigin(name: string, value: string, requireHttps: boolean): string {
    let parsed: URL;

    try {
        parsed = new URL(value);
    } catch {
        throw new AuthConfigurationError(`${name} must be an absolute URL such as https://example.com`);
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new AuthConfigurationError(`${name} must use http or https`);
    }

    if (requireHttps && parsed.protocol !== "https:") {
        throw new AuthConfigurationError(`${name} must use https in production`);
    }

    if (
        parsed.username.length > 0 ||
        parsed.password.length > 0 ||
        parsed.pathname !== "/" ||
        parsed.search.length > 0 ||
        parsed.hash.length > 0
    ) {
        throw new AuthConfigurationError(`${name} must be a bare origin with no path or credentials`);
    }

    return parsed.origin;
}

/**
 * Resolves the authentication configuration for the current invocation.
 *
 * @throws {AuthConfigurationError} when required configuration is missing or
 *   fails validation. Callers map this to an HTTP 503 without leaking detail.
 */
export function getAuthConfig(): AuthConfig {
    const appEnv = readEnv("APP_ENV") ?? "production";
    const isDevelopment = appEnv === "development";
    const isProduction = !isDevelopment;

    const sessionSecret = readEnv("SESSION_SECRET");

    if (sessionSecret === undefined) {
        throw new AuthConfigurationError("SESSION_SECRET is not configured");
    }

    assertSecretStrength("SESSION_SECRET", sessionSecret);

    const rawSiteOrigin = readEnv("SITE_ORIGIN");

    if (rawSiteOrigin === undefined && isProduction) {
        throw new AuthConfigurationError("SITE_ORIGIN is not configured");
    }

    const siteOrigin = normaliseOrigin(
        "SITE_ORIGIN",
        rawSiteOrigin ?? DEVELOPMENT_SITE_ORIGIN,
        isProduction,
    );

    const rawSetupToken = readEnv("ADMIN_SETUP_TOKEN");
    const adminSetupToken = rawSetupToken ?? null;

    if (adminSetupToken !== null) {
        assertSecretStrength("ADMIN_SETUP_TOKEN", adminSetupToken);
    }

    return {
        appEnv,
        isDevelopment,
        isProduction,
        sessionSecret,
        siteOrigin,
        adminSetupToken,
        sessionCookieName: isDevelopment ? DEVELOPMENT_SESSION_COOKIE : PRODUCTION_SESSION_COOKIE,
        cookieSecure: isProduction,
        sessionAbsoluteTtlMs: SESSION_ABSOLUTE_TTL_MS,
        sessionIdleTtlMs: SESSION_IDLE_TTL_MS,
        loginWindowMs: LOGIN_WINDOW_MS,
        maxFailuresPerIp: MAX_FAILURES_PER_IP,
        maxFailuresPerIdentity: MAX_FAILURES_PER_IDENTITY,
        attemptRetentionMs: ATTEMPT_RETENTION_MS,
    };
}
