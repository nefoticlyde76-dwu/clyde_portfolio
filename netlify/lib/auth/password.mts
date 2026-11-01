/**
 * Password hashing for the administrator account.
 *
 * Algorithm: Argon2id via `@node-rs/argon2` (prebuilt Rust N-API binding).
 * The library is given the OWASP minimum configuration explicitly — its own
 * defaults are not relied upon, so a dependency upgrade cannot silently change
 * the work factor of newly created hashes.
 *
 * The encoded output is a PHC string, for example:
 *
 *   $argon2id$v=19$m=19456,t=2,p=1$<base64 salt>$<base64 tag>
 *
 * which is self-describing: salt, parameters and algorithm version all travel
 * with the hash, so `needsRehash()` can detect a hash produced under an older
 * policy without any out-of-band metadata.
 *
 * Nothing in this module logs, returns or throws password material.
 */

import type { Options } from "@node-rs/argon2";
import * as argon2 from "@node-rs/argon2";

import { randomToken } from "./crypto.mts";

/**
 * `@node-rs/argon2` declares `Algorithm` and `Version` as *ambient const enums*,
 * and this project compiles with `verbatimModuleSyntax`, which forbids reading
 * the members of an ambient const enum as values (TS2748).
 *
 * The runtime objects are therefore described structurally below and read from
 * the package's own namespace import — the real enum values are still used, not
 * re-declared constants. `netlify/lib/auth`'s unit tests additionally assert
 * that these projections equal the package's actual enum values, so the mapping
 * cannot drift silently on a dependency upgrade.
 */
interface Argon2RuntimeEnums {
    readonly Algorithm: {
        readonly Argon2d: number;
        readonly Argon2i: number;
        readonly Argon2id: number;
    };
    readonly Version: {
        readonly V0x10: number;
        readonly V0x13: number;
    };
}

const runtimeEnums = argon2 as unknown as Argon2RuntimeEnums;

if (
    typeof runtimeEnums.Algorithm?.Argon2id !== "number" ||
    typeof runtimeEnums.Version?.V0x13 !== "number"
) {
    throw new Error(
        "@node-rs/argon2 did not expose its Algorithm/Version enums; the native binding is unusable.",
    );
}

/** Argon2id — the hybrid variant recommended by RFC 9106. */
export const ARGON2_ALGORITHM: number = runtimeEnums.Algorithm.Argon2id;

/** Argon2 version 0x13 (19), the current normative version. */
export const ARGON2_VERSION: number = runtimeEnums.Version.V0x13;

/** Memory cost in KiB (19 MiB) — the OWASP minimum configuration. */
export const ARGON2_MEMORY_COST = 19_456;

/** Number of passes. */
export const ARGON2_TIME_COST = 2;

/** Degree of parallelism. */
export const ARGON2_PARALLELISM = 1;

/** Length of the raw tag in bytes (256-bit). */
export const ARGON2_OUTPUT_LENGTH = 32;

/** Stable identifier for the hashing scheme, used in logs and reports. */
export const PASSWORD_HASH_SCHEME = "argon2id";

/** Hashing and verification options applied to every hash this system creates. */
export const ARGON2_OPTIONS: Options = {
    algorithm: ARGON2_ALGORITHM,
    version: ARGON2_VERSION,
    memoryCost: ARGON2_MEMORY_COST,
    timeCost: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
    outputLen: ARGON2_OUTPUT_LENGTH,
};

/**
 * Hashes a password with Argon2id and a fresh random 16-byte salt.
 *
 * The salt is generated inside the binding and embedded in the PHC string, so
 * every call produces a different hash for the same input.
 */
export function hashPassword(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a password against a stored PHC hash.
 *
 * Returns `false` — never throws — when the stored value is empty, malformed or
 * not an Argon2id hash, so a corrupted row cannot turn a failed sign-in into a
 * server error. The comparison inside the binding is constant-time.
 */
export async function verifyPassword(encodedHash: string, password: string): Promise<boolean> {
    if (encodedHash.length === 0 || password.length === 0) {
        return false;
    }

    try {
        return await argon2.verify(encodedHash, password, ARGON2_OPTIONS);
    } catch {
        return false;
    }
}

/**
 * True when `encodedHash` was produced with weaker parameters than the current
 * policy, or is not a usable Argon2id hash at all.
 *
 * Only the *parameters* are compared; the salt and tag are irrelevant.
 */
export function needsRehash(encodedHash: string): boolean {
    try {
        const parsed = argon2.parseOptions(encodedHash);

        return (
            parsed.algorithm !== ARGON2_ALGORITHM ||
            parsed.version !== ARGON2_VERSION ||
            parsed.memoryCost < ARGON2_MEMORY_COST ||
            parsed.timeCost < ARGON2_TIME_COST ||
            parsed.parallelism !== ARGON2_PARALLELISM ||
            parsed.outputLen < ARGON2_OUTPUT_LENGTH
        );
    } catch {
        return true;
    }
}

let dummyHash: Promise<string> | undefined;

/**
 * Returns a hash of a throw-away random value, used to equalise the response
 * time of "unknown account" and "wrong password".
 *
 * Without this, a sign-in attempt against a non-existent address would return
 * after a single indexed lookup, while a real address costs a full Argon2id
 * verification — a measurable difference that leaks account existence. The
 * value is generated once per function instance from random material and is
 * never a credential.
 */
export function dummyPasswordHash(): Promise<string> {
    dummyHash ??= hashPassword(randomToken());

    return dummyHash;
}
