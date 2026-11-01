/**
 * Input validation for the administrator authentication flow.
 *
 * Two rules govern everything here:
 *
 *   1. **Passwords are never normalised.** PHP reads the submitted password
 *      verbatim (`(string) $_POST['password']`) and hashes it exactly as typed.
 *      Trimming or Unicode-normalising it here would silently accept a
 *      different string from the one the operator provisioned, so the value is
 *      only ever *measured*, never rewritten.
 *   2. **The login identifier is normalised exactly as PHP does it** —
 *      `strtolower(trim($identifier))` — because the same normalised string is
 *      later hashed into the rate-limit bucket key. Any divergence between the
 *      lookup value and the throttle key would let one identity occupy two
 *      buckets.
 *
 * PHP's `strtolower()` is byte-oriented and, with no locale set, only folds
 * `A`–`Z`. JavaScript's `toLowerCase()` is Unicode-aware and would fold
 * additional characters, so `asciiLower()` reproduces the PHP behaviour
 * instead. The same reasoning applies to PHP's `trim()`, whose default
 * character list is narrower than JavaScript's `trim()`.
 */

import type { ValidationFailure, ValidationResult } from "./http.mts";

/** Shortest accepted administrator password (Phase 3A §3.2). */
export const MIN_PASSWORD_LENGTH = 12;

/** Longest accepted administrator password (Phase 3A §3.2). */
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Hard ceiling on the UTF-8 size of a submitted password.
 *
 * 128 characters can never exceed 384 bytes (three bytes per code unit is the
 * worst case for JavaScript string length), so this is a defensive cap rather
 * than a functional limit: it bounds the work an attacker can force before the
 * expensive hash is ever reached.
 */
export const MAX_PASSWORD_BYTES = 512;

/** Longest accepted administrator display name. */
export const MAX_NAME_LENGTH = 120;

/** Maximum address length accepted by the existing admins.email column. */
export const MAX_EMAIL_LENGTH = 190;

/** Maximum length of the local part of an email address (RFC 5321). */
export const MAX_EMAIL_LOCAL_LENGTH = 64;

/**
 * PHP's default `trim()` character list: space, tab, LF, CR, NUL and vertical tab.
 *
 * Reproduced explicitly so the normalised identifier matches PHP byte for byte.
 */
const PHP_TRIM_PATTERN = /^[\t\n\r\0\x0B ]+|[\t\n\r\0\x0B ]+$/g;

/**
 * Username fallback accepted by the PHP login form.
 *
 * Mirrors `preg_match('/^[a-z0-9][a-z0-9._-]{1,39}$/', $email)` — applied to
 * the already lower-cased, trimmed value.
 */
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,39}$/;

/**
 * Practical email shape check.
 *
 * Deliberately stricter than `FILTER_VALIDATE_EMAIL`: the address is only used
 * for an indexed equality lookup, so rejecting an exotic-but-legal address is
 * a harmless "no such account", whereas accepting a malformed one would widen
 * the set of distinct throttle buckets an attacker can create.
 */
const EMAIL_PATTERN = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

/** Folds `A`–`Z` only, matching PHP's `strtolower()` under the default locale. */
export function asciiLower(value: string): string {
    return value.replace(/[A-Z]/g, (character) => character.toLowerCase());
}

/** Trims the same characters PHP's `trim()` trims by default. */
export function phpTrim(value: string): string {
    return value.replace(PHP_TRIM_PATTERN, "");
}

function invalid(code: string, message: string): ValidationFailure {
    return { ok: false, code, message };
}

/** True when `value` is a string, so callers can reject non-string JSON members. */
function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string";
}

/** Number of UTF-8 bytes a string occupies. */
export function utf8ByteLength(value: string): number {
    return Buffer.byteLength(value, "utf8");
}

/**
 * Validates an administrator password for provisioning.
 *
 * The submitted string is returned unchanged — no trim, no normalisation — so
 * the hash always corresponds to exactly what the operator typed.
 */
export function validatePassword(value: unknown): ValidationResult<string> {
    if (!isNonEmptyString(value)) {
        return invalid("password_required", "Enter a password.");
    }

    if (value.length < MIN_PASSWORD_LENGTH) {
        return invalid(
            "password_too_short",
            `Use at least ${MIN_PASSWORD_LENGTH} characters. Entered so far: ${value.length}.`,
        );
    }

    if (value.length > MAX_PASSWORD_LENGTH) {
        return invalid(
            "password_too_long",
            `Use at most ${MAX_PASSWORD_LENGTH} characters. Entered: ${value.length}.`,
        );
    }

    if (utf8ByteLength(value) > MAX_PASSWORD_BYTES) {
        return invalid(
            "password_too_large",
            `That password is too long once encoded (limit ${MAX_PASSWORD_BYTES} bytes).`,
        );
    }

    return { ok: true, value };
}

/** Validates the administrator display name. */
export function validateName(value: unknown): ValidationResult<string> {
    if (!isNonEmptyString(value)) {
        return invalid("name_required", "Enter a name.");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
        return invalid("name_required", "Enter a name.");
    }

    if (trimmed.length > MAX_NAME_LENGTH) {
        return invalid("name_too_long", `Use at most ${MAX_NAME_LENGTH} characters.`);
    }

    return { ok: true, value: trimmed };
}

/** True when `value` looks like an address this system would accept. */
export function isEmailAddress(value: string): boolean {
    if (value.length === 0 || value.length > MAX_EMAIL_LENGTH) {
        return false;
    }

    const atIndex = value.lastIndexOf("@");

    if (atIndex <= 0 || atIndex > MAX_EMAIL_LOCAL_LENGTH) {
        return false;
    }

    return EMAIL_PATTERN.test(value);
}

/**
 * Validates an administrator email address for provisioning.
 *
 * The stored form is the trimmed, ASCII-lower-cased address, matching how the
 * PHP model compares it (`WHERE email = :email` against a lower-cased input).
 */
export function validateEmail(value: unknown): ValidationResult<string> {
    if (!isNonEmptyString(value)) {
        return invalid("email_required", "Enter an email address.");
    }

    if (value.length > MAX_EMAIL_LENGTH) {
        return invalid("email_too_long", `Use at most ${MAX_EMAIL_LENGTH} characters.`);
    }

    const normalised = asciiLower(phpTrim(value));

    if (!isEmailAddress(normalised)) {
        return invalid("email_invalid", "Enter a valid email address, for example name@example.com.");
    }

    return { ok: true, value: normalised };
}

/**
 * Applies the PHP login normalisation to a submitted identifier.
 *
 * Returns a string even for unusable input (for example a number or an empty
 * value): the caller still needs a deterministic value to derive the throttle
 * bucket key from, and every rejected attempt must be counted.
 */
export function normaliseLoginIdentifier(value: unknown): string {
    if (typeof value !== "string") {
        return "";
    }

    return asciiLower(phpTrim(value));
}

/**
 * True when the normalised identifier is acceptable to the login endpoint.
 *
 * Parity with `AuthController::login()`: the value must be either a valid
 * email address or a username-shaped string. Note that the database lookup is
 * by email only — the username branch exists purely so the request is not
 * rejected before the generic credential check.
 */
export function isValidLoginIdentifier(normalised: string): boolean {
    return isEmailAddress(normalised) || USERNAME_PATTERN.test(normalised);
}
