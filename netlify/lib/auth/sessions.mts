/**
 * Server-side administrator sessions.
 *
 * The raw token exists in exactly two places: the client's cookie, and the
 * argument list of the request that presented it. The database stores only
 * `sha256hex(token)` in `admin_sessions.token_hash`, so a database leak yields
 * digests that cannot be replayed (threat T9).
 *
 * Two independent expiry conditions are enforced, both evaluated against the
 * *database* clock so that a skewed function instance cannot extend a session:
 *
 *   - absolute: `now() >= expires_at` (8 hours from issue);
 *   - idle:     `now() - last_used > 30 minutes`.
 *
 * Every function takes the caller's `TransactionClient`, so session work can be
 * combined atomically with the login throttle and the identity lookup.
 */

import type { TransactionClient } from "../database.mts";

import type { AdminIdentity } from "./admins.mts";
import type { AuthConfig } from "./config.mts";
import { sha256Hex, TOKEN_LENGTH, randomToken } from "./crypto.mts";

/** Shape of a session token as it appears in a cookie (43 base64url chars). */
const SESSION_TOKEN_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${TOKEN_LENGTH}}$`);

/** A freshly minted session, before the cookie is written. */
export interface IssuedSession {
    readonly rawToken: string;
    readonly expiresAt: Date;
}

/** A validated session together with the administrator it belongs to. */
export interface AuthenticatedSession {
    readonly sessionId: string;
    readonly adminId: number;
    readonly rawToken: string;
    readonly expiresAt: Date;
    readonly lastUsed: Date;
    readonly admin: AdminIdentity;
}

/** True when a cookie value is shaped like a session token. */
export function isSessionTokenShaped(value: string): boolean {
    return SESSION_TOKEN_PATTERN.test(value);
}

/** The at-rest form of a session token. */
export function hashSessionToken(rawToken: string): string {
    return sha256Hex(rawToken);
}

/** Converts a millisecond lifetime to whole seconds for `make_interval()`. */
function toSeconds(milliseconds: number): number {
    return Math.max(1, Math.floor(milliseconds / 1000));
}

/**
 * Mints a new session row for an administrator.
 *
 * The token is 32 cryptographically random bytes encoded as base64url, giving
 * 256 bits of entropy. The absolute expiry is computed by PostgreSQL from
 * `now()`, so it cannot be influenced by the caller.
 */
export async function issueSession(
    client: TransactionClient,
    adminId: number,
    config: AuthConfig,
): Promise<IssuedSession> {
    const rawToken = randomToken();

    const result = await client.query<{ expires_at: Date }>(
        `INSERT INTO admin_sessions (admin_id, token_hash, expires_at)
              VALUES ($1, $2, now() + make_interval(secs => $3))
           RETURNING expires_at`,
        [adminId, hashSessionToken(rawToken), toSeconds(config.sessionAbsoluteTtlMs)],
    );

    const row = result.rows[0];

    if (row === undefined) {
        throw new Error("Session insert returned no row.");
    }

    return { rawToken, expiresAt: row.expires_at };
}

/**
 * Resolves a presented token to an active session.
 *
 * Returns `null` when the token is unknown **or** expired. An expired row is
 * deleted at the same time, so a stale cookie cannot keep a dead session alive
 * (threat T6). A successful resolution refreshes `last_used`, which is what
 * implements the idle timeout.
 */
export async function resolveSession(
    client: TransactionClient,
    rawToken: string,
    config: AuthConfig,
): Promise<AuthenticatedSession | null> {
    const result = await client.query<{
        id: string;
        admin_id: number;
        expires_at: Date;
        last_used: Date;
        name: string;
        email: string;
        expired: boolean;
    }>(
        `SELECT s.id,
                s.admin_id,
                s.expires_at,
                s.last_used,
                a.name,
                a.email,
                (now() >= s.expires_at
                 OR now() - s.last_used >= make_interval(secs => $2)) AS expired
           FROM admin_sessions s
           JOIN admins a ON a.id = s.admin_id
          WHERE s.token_hash = $1
          LIMIT 1`,
        [hashSessionToken(rawToken), toSeconds(config.sessionIdleTtlMs)],
    );

    const row = result.rows[0];

    if (row === undefined) {
        return null;
    }

    if (row.expired) {
        await client.query("DELETE FROM admin_sessions WHERE id = $1", [row.id]);

        return null;
    }

    const touched = await client.query<{ last_used: Date }>(
        "UPDATE admin_sessions SET last_used = now() WHERE id = $1 RETURNING last_used",
        [row.id],
    );

    return {
        sessionId: row.id,
        adminId: row.admin_id,
        rawToken,
        expiresAt: row.expires_at,
        lastUsed: touched.rows[0]?.last_used ?? row.last_used,
        admin: { id: row.admin_id, name: row.name, email: row.email },
    };
}

/**
 * Deletes the session identified by a raw token.
 *
 * Used for logout and, more importantly, for rotation at login: revoking only
 * the session the presenting browser already holds keeps other devices signed
 * in (threat T4). Returns the number of rows removed.
 */
export async function revokeSessionByRawToken(
    client: TransactionClient,
    rawToken: string,
): Promise<number> {
    const result = await client.query("DELETE FROM admin_sessions WHERE token_hash = $1", [
        hashSessionToken(rawToken),
    ]);

    return result.rowCount ?? 0;
}

/** Removes every expired session row. Run opportunistically on login. */
export async function sweepExpiredSessions(client: TransactionClient): Promise<number> {
    const result = await client.query("DELETE FROM admin_sessions WHERE expires_at < now()");

    return result.rowCount ?? 0;
}
