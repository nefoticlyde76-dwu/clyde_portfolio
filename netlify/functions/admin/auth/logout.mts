/**
 * `POST /api/admin/auth/logout` — revokes the current session.
 *
 * Parity with `AuthController::logout()`: `POST` only, CSRF required, and the
 * session row is deleted before the cookie is cleared so a replay of the old
 * cookie fails even if the browser does not honour the deletion.
 *
 * Only the presenting session is revoked. Any other device the administrator
 * is signed in on keeps working until its own session ends.
 */

import { withTransaction } from "../../../lib/database.mts";

import {
    assertMethod,
    loadAuthConfig,
    requireAdminSession,
    requireCsrf,
    requireOrigin,
} from "../../../lib/auth/guards.mts";
import {
    emptyResponse,
    serialiseClearedSessionCookie,
    toErrorResponse,
} from "../../../lib/auth/http.mts";
import { assertSecureTransport } from "../../../lib/auth/origin.mts";
import { revokeSessionByRawToken } from "../../../lib/auth/sessions.mts";

/** Declares the public path so the route does not depend on file placement. */
export const config = { path: "/api/admin/auth/logout" };

export default async function logout(request: Request): Promise<Response> {
    try {
        const auth = loadAuthConfig();

        assertMethod(request, ["POST"]);
        assertSecureTransport(request, auth);
        requireOrigin(request, auth);

        const session = await requireAdminSession(request, auth);

        requireCsrf(request, auth, session);

        await withTransaction((client) => revokeSessionByRawToken(client, session.rawToken));

        return emptyResponse(204, {
            "Set-Cookie": serialiseClearedSessionCookie(auth.sessionCookieName, auth.cookieSecure),
        });
    } catch (error) {
        return toErrorResponse(error);
    }
}
