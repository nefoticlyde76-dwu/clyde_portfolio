/**
 * `POST /api/admin/setup` — one-time provisioning of the first administrator.
 *
 * This is the only endpoint that can create an administrator, and it is
 * available only while two conditions hold:
 *
 *   1. `ADMIN_SETUP_TOKEN` is configured in the server environment. When it is
 *      not, the endpoint answers `404` and takes no other action — the check
 *      happens before the request body is even read.
 *   2. The one-time setup guard is unclaimed. Its conditional update and admin
 *      insert share a transaction, so concurrent setup requests cannot both
 *      succeed (see `netlify/lib/auth/provisioning.mts`).
 *
 * Guard order, cheapest and least revealing first:
 *
 *     configuration → method → availability → HTTPS → Origin
 *       → payload shape → field validity → throttle → setup secret → provision
 *
 * The throttle is consulted *before* the secret is compared so that the secret
 * cannot be brute-forced; a wrong secret therefore still counts as an attempt.
 * Nothing from the request body is ever logged.
 */

import type { Context } from "@netlify/functions";

import { withTransaction } from "../../lib/database.mts";

import { HttpError, errorResponse, jsonResponse, readJsonBody, toErrorResponse } from "../../lib/auth/http.mts";
import { assertSecureTransport } from "../../lib/auth/origin.mts";
import {
    assertMethod,
    loadAuthConfig,
    readClientIp,
    requireOrigin,
} from "../../lib/auth/guards.mts";
import { provisionFirstAdmin, verifySetupToken } from "../../lib/auth/provisioning.mts";
import {
    checkLoginRateLimit,
    identityBucketKey,
    ipBucketKey,
    recordLoginFailure,
    releaseLoginRateLimitReservation,
    type LoginBuckets,
} from "../../lib/auth/rate-limit.mts";
import { validateEmail, validateName, validatePassword } from "../../lib/auth/validation.mts";

/** Declares the public path so the route does not depend on file placement. */
export const config = { path: "/api/admin/setup" };

export default async function setupAdmin(request: Request, context: Context): Promise<Response> {
    try {
        const auth = loadAuthConfig();

        assertMethod(request, ["POST"]);

        const setupToken = auth.adminSetupToken;

        if (setupToken === null) {
            throw new HttpError(
                404,
                "setup_unavailable",
                "First-administrator setup is not available.",
            );
        }

        assertSecureTransport(request, auth);
        requireOrigin(request, auth);

        const body = await readJsonBody(request);

        if (!body.ok) {
            throw new HttpError(400, "setup_invalid_payload", body.message);
        }

        const name = validateName(body.value.name);
        const email = validateEmail(body.value.email);
        const password = validatePassword(body.value.password);

        if (!name.ok) {
            throw new HttpError(400, "setup_invalid_payload", name.message);
        }

        if (!email.ok) {
            throw new HttpError(400, "setup_invalid_payload", email.message);
        }

        if (!password.ok) {
            throw new HttpError(400, "setup_invalid_payload", password.message);
        }

        const buckets: LoginBuckets = {
            ip: ipBucketKey(readClientIp(context)),
            identity: identityBucketKey(email.value),
        };

        const access = await withTransaction(async (client) => {
            const decision = await checkLoginRateLimit(client, auth, buckets);

            if (!decision.allowed) {
                return {
                    status: "limited" as const,
                    retryAfterSeconds: decision.retryAfterSeconds,
                };
            }

            if (!verifySetupToken(setupToken, body.value.setupToken)) {
                await recordLoginFailure(client, buckets, auth);

                return { status: "unauthorized" as const };
            }

            await releaseLoginRateLimitReservation(client, buckets);

            return { status: "authorized" as const };
        });

        if (access.status === "limited") {
            return errorResponse(
                429,
                "too_many_attempts",
                "Too many setup attempts. Try again shortly.",
                { "Retry-After": String(access.retryAfterSeconds) },
            );
        }

        if (access.status === "unauthorized") {
            throw new HttpError(401, "setup_unauthorized", "That setup token was not recognised.");
        }

        const outcome = await provisionFirstAdmin({
            name: name.value,
            email: email.value,
            password: password.value,
        });

        if (outcome.status === "closed") {
            throw new HttpError(410, "setup_closed", "An administrator account already exists.");
        }

        return jsonResponse(201, { admin: outcome.admin });
    } catch (error) {
        return toErrorResponse(error);
    }
}
