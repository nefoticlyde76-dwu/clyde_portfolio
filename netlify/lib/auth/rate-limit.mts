/**
 * Concurrency-safe login throttling.
 *
 * Two buckets are maintained for every sign-in attempt, keyed by namespaced
 * digests — never raw values. Rolling counters live in
 * `login_rate_limit_buckets`; `login_attempts` retains hashed attempt records:
 *
 *   - `ip:<sha256(client ip)>`  — 5 attempts per 15 minutes;
 *   - `id:<sha256(identifier)>` — 10 attempts per 15 minutes.
 *
 * The second bucket covers both email-shaped and username-shaped submissions:
 * its input is the *normalised* identifier the lookup will use, so one identity
 * cannot occupy two counters by changing its letter case or surrounding
 * whitespace.
 *
 * The check and result are handled in one transaction. Each bucket row tracks
 * rolling failure timestamps plus in-flight checks. A conditional UPDATE
 * reserves capacity atomically, and the transaction retains that row update
 * while credentials are verified. Reservations are released on every outcome;
 * only failures are persisted as attempts.
 *
 * Each transaction:
 *
 *   1. sweep records older than the retention window;
 *   2. atomically reserve each bucket in a stable sorted order;
 *   3. refuse when failures plus in-flight checks reach a threshold;
 *   4. verify credentials while the transaction holds those row updates;
 *   5. persist failures or clear failures on success, releasing reservations;
 *   6. commit, which releases the row updates.
 *
 * Password verification is expensive, but holding the locks during it is
 * necessary to enforce the configured limit; the reservations are scoped only
 * to the submitted IP and identity and are rolled back with the transaction.
 */

import type { TransactionClient } from "../database.mts";

import type { AuthConfig } from "./config.mts";
import { sha256Hex } from "./crypto.mts";
function orderBucketKeys(bucketKeys: readonly string[]): string[] {
    return [...new Set(bucketKeys)].sort();
}

/** Prefix identifying a client-IP bucket. */
export const IP_BUCKET_PREFIX = "ip:";

/** Prefix identifying a login-identifier bucket. */
export const IDENTITY_BUCKET_PREFIX = "id:";

/** The two bucket keys one login attempt contributes to. */
export interface LoginBuckets {
    readonly ip: string;
    readonly identity: string;
}

/** Outcome of the throttle check. */
export interface RateLimitDecision {
    readonly allowed: boolean;
    /** Seconds until the oldest counted attempt leaves the window. */
    readonly retryAfterSeconds: number;
}

type BucketStateRow = {
    failure_times: Date[];
    in_flight: number;
    observed_at: Date;
};

interface BucketState {
    readonly count: number;
    readonly inFlight: number;
    readonly oldestAt: Date | null;
    readonly observedAt: Date;
}

/** Bucket key for a client IP. The IP itself is never stored. */
export function ipBucketKey(clientIp: string): string {
    return `${IP_BUCKET_PREFIX}${sha256Hex(clientIp)}`;
}

/** Bucket key for a normalised login identifier. Never stored in the clear. */
export function identityBucketKey(normalisedIdentifier: string): string {
    return `${IDENTITY_BUCKET_PREFIX}${sha256Hex(normalisedIdentifier)}`;
}

/** Converts a millisecond duration to whole seconds for `make_interval()`. */
function toSeconds(milliseconds: number): number {
    return Math.max(1, Math.floor(milliseconds / 1000));
}

/**
 * Serialises the remaining wait time until the oldest counted attempt expires.
 *
 * Uses the database clock (`now()`) rather than `Date.now()`, so the value
 * reported in `Retry-After` matches the clock the threshold check used.
 */
function retryAfterSeconds(state: BucketState, windowMs: number): number {
    if (state.count === 0 || state.oldestAt === null) {
        return 1;
    }

    const windowSeconds = windowMs / 1000;
    const elapsedSeconds = (state.observedAt.getTime() - state.oldestAt.getTime()) / 1000;

    return Math.max(1, Math.ceil(windowSeconds - elapsedSeconds));
}

/**
/** Deletes attempt records older than the retention window. */
export async function sweepOldLoginAttempts(
    client: TransactionClient,
    config: AuthConfig,
): Promise<number> {
    const retentionSeconds = toSeconds(config.attemptRetentionMs);
    const result = await client.query(
        "DELETE FROM login_attempts WHERE attempted_at < now() - make_interval(secs => $1)",
        [retentionSeconds],
    );

    await client.query(
        `DELETE FROM login_rate_limit_buckets
          WHERE updated_at < now() - make_interval(secs => $1)
            AND in_flight = 0`,
        [retentionSeconds],
    );

    return result.rowCount ?? 0;
}

function stateFromRow(row: BucketStateRow | undefined): BucketState {
    const failures = row?.failure_times ?? [];

    return {
        count: failures.length,
        inFlight: row?.in_flight ?? 0,
        oldestAt: failures.reduce<Date | null>(
            (oldest, failureAt) =>
                oldest === null || failureAt.getTime() < oldest.getTime() ? failureAt : oldest,
            null,
        ),
        observedAt: row?.observed_at ?? new Date(),
    };
}

/** Reads the current bucket state after an atomic reservation was refused. */
async function readBucketState(
    client: TransactionClient,
    bucketKey: string,
): Promise<BucketState> {
    const result = await client.query<BucketStateRow>(
        `SELECT failure_times, in_flight, now() AS observed_at
           FROM login_rate_limit_buckets
          WHERE identifier = $1`,
        [bucketKey],
    );

    return stateFromRow(result.rows[0]);
}

/** Releases an in-flight reservation for one bucket within the current transaction. */
async function releaseBucketReservation(
    client: TransactionClient,
    bucketKey: string,
): Promise<void> {
    const result = await client.query(
        `UPDATE login_rate_limit_buckets
            SET in_flight = in_flight - 1,
                updated_at = now()
          WHERE identifier = $1
            AND in_flight > 0`,
        [bucketKey],
    );

    if (result.rowCount !== 1) {
        throw new Error("Login rate-limit reservation state is inconsistent");
    }
}

/**
 * Checks the thresholds and, when allowed, records the attempt.
 *
 * Must be called inside `withTransaction()`. When allowed, the caller must
 * record a failure, clear failures, or release the reservation before the
 * transaction completes.
 */
export async function checkLoginRateLimit(
    client: TransactionClient,
    config: AuthConfig,
    buckets: LoginBuckets,
): Promise<RateLimitDecision> {
    await sweepOldLoginAttempts(client, config);

    const windowSeconds = toSeconds(config.loginWindowMs);
    const limits = new Map([
        [buckets.ip, config.maxFailuresPerIp],
        [buckets.identity, config.maxFailuresPerIdentity],
    ]);
    const reserved: string[] = [];

    for (const bucketKey of orderBucketKeys([buckets.ip, buckets.identity])) {
        await client.query(
            "INSERT INTO login_rate_limit_buckets (identifier) VALUES ($1) ON CONFLICT DO NOTHING",
            [bucketKey],
        );

        const recentFailures =
            `ARRAY(SELECT failure_at ` +
            `FROM unnest(login_rate_limit_buckets.failure_times) AS failure_at ` +
            `WHERE failure_at > now() - make_interval(secs => $2))`;
        const result = await client.query<BucketStateRow>(
            `UPDATE login_rate_limit_buckets
                SET failure_times = ${recentFailures},
                    in_flight = in_flight + 1,
                    updated_at = now()
              WHERE identifier = $1
                AND cardinality(${recentFailures}) + in_flight < $3
          RETURNING failure_times, in_flight, now() AS observed_at`,
            [bucketKey, windowSeconds, limits.get(bucketKey)],
        );

        if (result.rowCount === 1) {
            reserved.push(bucketKey);
            continue;
        }

        const state = await readBucketState(client, bucketKey);

        for (const reservedKey of reserved) {
            await releaseBucketReservation(client, reservedKey);
        }

        const retryAfter =
            state.count < (limits.get(bucketKey) ?? 0) && state.inFlight > 0
                ? 1
                : retryAfterSeconds(state, config.loginWindowMs);

        return { allowed: false, retryAfterSeconds: retryAfter };
    }

    return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Persists one failed attempt for each namespaced bucket.
 *
 * Call in the same transaction as `checkLoginRateLimit()` so the bucket
 * reservations remain held from threshold check through failure recording.
 */
export async function recordLoginFailure(
    client: TransactionClient,
    buckets: LoginBuckets,
    config: AuthConfig,
): Promise<number> {
    const recentFailures =
        `ARRAY(SELECT failure_at ` +
        `FROM unnest(login_rate_limit_buckets.failure_times) AS failure_at ` +
        `WHERE failure_at > now() - make_interval(secs => $2))`;

    for (const bucketKey of orderBucketKeys([buckets.ip, buckets.identity])) {
        const result = await client.query(
            `UPDATE login_rate_limit_buckets
                SET failure_times = array_append(${recentFailures}, now()),
                    in_flight = in_flight - 1,
                    updated_at = now()
              WHERE identifier = $1
                AND in_flight > 0`,
            [bucketKey, toSeconds(config.loginWindowMs)],
        );

        if (result.rowCount !== 1) {
            throw new Error("Login rate-limit reservation state is inconsistent");
        }
    }

    const result = await client.query(
        "INSERT INTO login_attempts (identifier) VALUES ($1), ($2)",
        [buckets.ip, buckets.identity],
    );

    return result.rowCount ?? 0;
}

/**
 * Clears the attempt records for both buckets of a successful sign-in.
 *
 * Mirrors `login_throttle_clear()` from the PHP implementation (which removed
 * every record for the caller's IP hash) and additionally clears the identity
 * bucket, so a correct password resets the whole picture for that attempt.
 */
export async function clearLoginAttempts(
    client: TransactionClient,
    buckets: LoginBuckets,
): Promise<number> {
    for (const bucketKey of orderBucketKeys([buckets.ip, buckets.identity])) {
        const result = await client.query(
            `UPDATE login_rate_limit_buckets
                SET failure_times = ARRAY[]::TIMESTAMPTZ[],
                    in_flight = in_flight - 1,
                    updated_at = now()
              WHERE identifier = $1
                AND in_flight > 0`,
            [bucketKey],
        );

        if (result.rowCount !== 1) {
            throw new Error("Login rate-limit reservation state is inconsistent");
        }
    }

    const result = await client.query(
        "DELETE FROM login_attempts WHERE identifier = $1 OR identifier = $2",
        [buckets.ip, buckets.identity],
    );

    return result.rowCount ?? 0;
}

/** Releases capacity without recording a failure (e.g. accepted setup token). */
export async function releaseLoginRateLimitReservation(
    client: TransactionClient,
    buckets: LoginBuckets,
): Promise<void> {
    for (const bucketKey of orderBucketKeys([buckets.ip, buckets.identity])) {
        await releaseBucketReservation(client, bucketKey);
    }
}
