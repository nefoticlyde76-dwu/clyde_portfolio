/**
 * `GET /api/admin/auth/me` — returns the signed-in administrator and a fresh
 * CSRF token.
 *
 * This is the endpoint the admin shell calls on load. It is read-only: a `GET`
 * must never modify application data, so its only side effect is the
 * `last_used` refresh that every successful session resolution performs.
 *
 * The response deliberately omits anything not needed to render the shell —
 * no password hash, no token hash, no session id — and the CSRF token is
 * derived from this session's token on every call, so it is never stored and
 * rotates with the session.
 *
 * No Origin check is applied: browsers do not attach an `Origin` header to a
 * same-origin `GET`, so requiring one would reject legitimate use. Origin
 * validation belongs on the state-changing endpoints.
 */

import { deriveCsrfToken } from "../../../lib/auth/csrf.mts";
import { assertMethod, loadAuthConfig, requireAdminSession } from "../../../lib/auth/guards.mts";
import { jsonResponse, toErrorResponse } from "../../../lib/auth/http.mts";

/** Declares the public path so the route does not depend on file placement. */
export const config = { path: "/api/admin/auth/me" };

export default async function me(request: Request): Promise<Response> {
    try {
        const auth = loadAuthConfig();

        assertMethod(request, ["GET"]);

        const session = await requireAdminSession(request, auth);

        return jsonResponse(200, {
            admin: session.admin,
            csrfToken: deriveCsrfToken(auth.sessionSecret, session.rawToken),
            expiresAt: session.expiresAt.toISOString(),
        });
    } catch (error) {
        return toErrorResponse(error);
    }
}
