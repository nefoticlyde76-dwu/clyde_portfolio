/**
 * `POST /api/admin/auth/login` — issues an administrator session.
 *
 * Behaviour mirrors `app/Controllers/Admin/AuthController::login()`:
 *
 *   - the identifier is normalised with `strtolower(trim(...))` and accepted
 *     when it is either an email address or a username-shaped string, but the
 *     database lookup is **by email only**;
 *   - a single generic failure message covers "no such account" and "wrong
 *     password", and a dummy verification is performed in the first case so the
 *     two responses cost the same;
 *   - the throttle is consulted before the password is verified.
 *
 * Two properties differ from the PHP implementation, both deliberately:
 *
 *   - the throttle is also keyed by the submitted identity, not only by IP, so
 *     a distributed attempt against one account is bounded as well;
 *   - a successful sign-in revokes the session the presenting browser already
 *     held (rotation) while leaving every other device signed in.
 *
 * The throttle check, credential verification, and failure-only record share
 * one transaction. Atomic bucket reservations remain held during the hash, so
 * simultaneous requests cannot pass the same failure count. Successful logins
 * release their reservations and clear their buckets before commit.
 */

import type { Context } from "@netlify/functions";

import { withTransaction } from "../../../lib/database.mts";

import { findAdminByEmail } from "../../../lib/auth/admins.mts";
import { deriveCsrfToken } from "../../../lib/auth/csrf.mts";
import {
    HttpError,
    errorResponse,
    jsonResponse,
    readJsonBody,
    serialiseSessionCookie,
    toErrorResponse,
} from "../../../lib/auth/http.mts";
import { assertSecureTransport } from "../../../lib/auth/origin.mts";
import {
    assertMethod,
    loadAuthConfig,
    readClientIp,
    readSessionToken,
    requireOrigin,
} from "../../../lib/auth/guards.mts";
import { dummyPasswordHash, verifyPassword } from "../../../lib/auth/password.mts";
import {
    clearLoginAttempts,
    checkLoginRateLimit,
    identityBucketKey,
    ipBucketKey,
    recordLoginFailure,
    type LoginBuckets,
} from "../../../lib/auth/rate-limit.mts";
import {
    issueSession,
    revokeSessionByRawToken,
    sweepExpiredSessions,
} from "../../../lib/auth/sessions.mts";
import {
    MAX_PASSWORD_LENGTH,
    isValidLoginIdentifier,
    normaliseLoginIdentifier,
} from "../../../lib/auth/validation.mts";

/** Declares the public path so the route does not depend on file placement. */
export const config = { path: "/api/admin/auth/login" };

/**
 * Fixed, non-secret stand-in used when no real verification can be performed.
 *
 * Substituting it keeps the Argon2id work identical across every rejection
 * path, so response time does not distinguish "bad identifier" from "bad
 * password" (threat T3).
 */
const PROBE_PASSWORD = "unusable-credential-probe";

export default async function login(request: Request, context: Context): Promise<Response> {
    try {
        const auth = loadAuthConfig();

        assertMethod(request, ["POST"]);
        assertSecureTransport(request, auth);
        requireOrigin(request, auth);

        const body = await readJsonBody(request);

        if (!body.ok) {
            throw new HttpError(400, "invalid_payload", body.message);
        }

        const submittedIdentifier = body.value.email;
        const submittedPassword = body.value.password;

        if (typeof submittedIdentifier !== "string" || submittedIdentifier.length === 0) {
            throw new HttpError(400, "invalid_payload", "Enter your email address.");
        }

        if (typeof submittedPassword !== "string" || submittedPassword.length === 0) {
            throw new HttpError(400, "invalid_payload", "Enter your password.");
        }

        const identifier = normaliseLoginIdentifier(submittedIdentifier);

        // An identifier that does not match the accepted shape, or a password
        // beyond the accepted maximum, can never be valid. Both are still
        // counted and still cost a full verification, so neither is
        // distinguishable from an ordinary wrong password.
        const canVerify =
            isValidLoginIdentifier(identifier) && submittedPassword.length <= MAX_PASSWORD_LENGTH;

        const buckets: LoginBuckets = {
            ip: ipBucketKey(readClientIp(context)),
            identity: identityBucketKey(identifier),
        };

        const outcome = await withTransaction(async (client) => {
            const decision = await checkLoginRateLimit(client, auth, buckets);

            if (!decision.allowed) {
                return {
                    status: "limited" as const,
                    retryAfterSeconds: decision.retryAfterSeconds,
                };
            }

            const credential = canVerify ? await findAdminByEmail(client, identifier) : null;

            const hashToVerify = credential?.passwordHash ?? (await dummyPasswordHash());
            const candidate = canVerify ? submittedPassword : PROBE_PASSWORD;
            const matched = await verifyPassword(hashToVerify, candidate);

            if (credential === null || !matched) {
                await recordLoginFailure(client, buckets, auth);

                return { status: "rejected" as const };
            }

            const presentedToken = readSessionToken(request, auth);

            if (presentedToken !== null) {
                await revokeSessionByRawToken(client, presentedToken);
            }

            await sweepExpiredSessions(client);

            const issued = await issueSession(client, credential.id, auth);

            await clearLoginAttempts(client, buckets);

            return {
                status: "authenticated" as const,
                admin: { id: credential.id, name: credential.name, email: credential.email },
                sessionToken: issued.rawToken,
            };
        });

        if (outcome.status === "limited") {
            // Keep the rejection path's cost comparable with a regular failed
            // credential check without holding the rate-limit transaction.
            await verifyPassword(await dummyPasswordHash(), PROBE_PASSWORD);

            return errorResponse(
                429,
                "too_many_attempts",
                "Too many sign-in attempts. Try again shortly.",
                { "Retry-After": String(outcome.retryAfterSeconds) },
            );
        }

        if (outcome.status === "rejected") {
            return errorResponse(
                401,
                "invalid_credentials",
                "Those sign-in details were not recognised.",
            );
        }

        const cookie = serialiseSessionCookie(
            auth.sessionCookieName,
            outcome.sessionToken,
            auth.cookieSecure,
        );

        return jsonResponse(
            200,
            {
                admin: outcome.admin,
                csrfToken: deriveCsrfToken(auth.sessionSecret, outcome.sessionToken),
            },
            { "Set-Cookie": cookie },
        );
    } catch (error) {
        return toErrorResponse(error);
    }
}
