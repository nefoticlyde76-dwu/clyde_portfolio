/**
 * HTTP plumbing shared by every administrator endpoint.
 *
 * Centralising it here means that four independent properties hold for every
 * authentication response by construction, rather than by each handler
 * remembering to do the right thing:
 *
 *   - a consistent JSON body shape (`{ error, message }` for failures);
 *   - the same security headers on every response, including errors;
 *   - `Cache-Control: no-store`, so no proxy or browser ever caches a
 *     response that carries identity or a CSRF token;
 *   - no stack trace, SQL text, file path or driver message ever reaches the
 *     client — unknown failures collapse to a generic `500 server_error`.
 *
 * The module holds no database access and no authentication decisions.
 */

/**
 * Maximum accepted length of an authentication request body.
 *
 * Every admin payload is a handful of short strings, so 8 KiB is generous.
 * Bounding it means a large body cannot be used to force an allocation before
 * validation has a chance to run.
 */
export const MAX_REQUEST_BODY_BYTES = 8 * 1024;

/** Successful validation outcome. */
export interface ValidationSuccess<T> {
    readonly ok: true;
    readonly value: T;
}

/** Failed validation outcome, carrying a stable machine-readable code. */
export interface ValidationFailure {
    readonly ok: false;
    readonly code: string;
    readonly message: string;
}

/** Result of validating untrusted input. */
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/** Machine-readable body returned for every non-2xx response. */
export interface ApiErrorBody {
    readonly error: string;
    readonly message: string;
}

/**
 * Security headers applied to every authentication response.
 *
 * `X-Frame-Options` and `frame-ancestors` are repeated even for JSON, because
 * the browser will still honour them when a response is rendered inside a
 * frame (threat T17, clickjacking of the admin shell).
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    "Referrer-Policy": "no-referrer",
};

/**
 * An error that is safe to translate directly into an HTTP response.
 *
 * Guards throw these; the top-level wrapper converts them. Anything that is
 * *not* an `HttpError` is treated as an internal fault, so an unexpected
 * exception can never leak its message to a client.
 */
export class HttpError extends Error {
    readonly status: number;
    readonly code: string;
    readonly headers: Record<string, string> | undefined;

    constructor(status: number, code: string, message: string, headers?: Record<string, string>) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.code = code;
        this.headers = headers;
    }
}

/** Builds a JSON response with the standard security headers. */
export function jsonResponse(
    status: number,
    body: unknown,
    extraHeaders?: Record<string, string>,
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...SECURITY_HEADERS, ...extraHeaders },
    });
}

/** Builds a bodiless response (used by `204 No Content`). */
export function emptyResponse(status: number, extraHeaders?: Record<string, string>): Response {
    const headers: Record<string, string> = { ...SECURITY_HEADERS, ...extraHeaders };

    delete headers["Content-Type"];

    return new Response(null, { status, headers });
}

/** Builds the standard `405 Method Not Allowed` response. */
export function methodNotAllowed(allowed: readonly string[]): Response {
    return jsonResponse(
        405,
        {
            error: "method_not_allowed",
            message: `Use ${allowed.join(" or ")} for this endpoint.`,
        } satisfies ApiErrorBody,
        { Allow: allowed.join(", ") },
    );
}

/** Builds the standard error response for a status and code. */
export function errorResponse(
    status: number,
    code: string,
    message: string,
    extraHeaders?: Record<string, string>,
): Response {
    return jsonResponse(status, { error: code, message } satisfies ApiErrorBody, extraHeaders);
}

/**
 * Maps an arbitrary thrown value onto a safe HTTP response.
 *
 * `HttpError` carries a message that was written for the client. Every other
 * exception — including database and driver errors — is collapsed to a
 * generic `500 server_error`; the detail belongs in the platform log, not in
 * the response.
 */
export function toErrorResponse(error: unknown): Response {
    if (error instanceof HttpError) {
        return errorResponse(error.status, error.code, error.message, error.headers);
    }

    return errorResponse(
        500,
        "server_error",
        "The request could not be completed. Try again shortly.",
    );
}

/**
 * Reads and parses a JSON request body.
 *
 * Rejects a body that is missing, oversized, not JSON, or not a JSON object.
 * The size check runs on the raw text before `JSON.parse`, so a large payload
 * cannot be used to force a large allocation.
 */
export async function readJsonBody(
    request: Request,
): Promise<ValidationResult<Record<string, unknown>>> {
    const declaredLength = request.headers.get("content-length");

    if (declaredLength !== null && Number(declaredLength) > MAX_REQUEST_BODY_BYTES) {
        return {
            ok: false,
            code: "payload_too_large",
            message: `The request body must be at most ${MAX_REQUEST_BODY_BYTES} bytes.`,
        };
    }

    const contentType = request.headers.get("content-type") ?? "";

    const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";

    if (mediaType !== "application/json" && !/^application\/[a-z0-9!#$&^_.+-]+\+json$/.test(mediaType)) {
        return {
            ok: false,
            code: "unsupported_media_type",
            message: "Send the request as JSON with Content-Type: application/json.",
        };
    }

    let text: string;

    try {
        text = await request.text();
    } catch {
        return { ok: false, code: "payload_unreadable", message: "The request body could not be read." };
    }

    if (text.length === 0) {
        return { ok: false, code: "payload_required", message: "Send a JSON object in the request body." };
    }

    if (Buffer.byteLength(text, "utf8") > MAX_REQUEST_BODY_BYTES) {
        return {
            ok: false,
            code: "payload_too_large",
            message: `The request body must be at most ${MAX_REQUEST_BODY_BYTES} bytes.`,
        };
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(text);
    } catch {
        return { ok: false, code: "payload_invalid_json", message: "The request body is not valid JSON." };
    }

    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {
            ok: false,
            code: "payload_invalid_json",
            message: "The request body must be a JSON object.",
        };
    }

    return { ok: true, value: parsed as Record<string, unknown> };
}

/** Parses a `Cookie` header into a lookup map. */
export function parseCookieHeader(header: string | null): Map<string, string> {
    const cookies = new Map<string, string>();

    if (header === null) {
        return cookies;
    }

    for (const part of header.split(";")) {
        const separator = part.indexOf("=");

        if (separator < 1) {
            continue;
        }

        const name = part.slice(0, separator).trim();

        if (name.length > 0 && !cookies.has(name)) {
            cookies.set(name, part.slice(separator + 1).trim());
        }
    }

    return cookies;
}

/** Reads one cookie value from the request, or `null` when absent. */
export function readCookieValue(request: Request, name: string): string | null {
    return parseCookieHeader(request.headers.get("cookie")).get(name) ?? null;
}

/**
 * Serialises the session cookie.
 *
 * `Path=/`, `HttpOnly`, `SameSite=Lax`; `Secure` is added unless the
 * configuration explicitly says this is local development. No `Domain` and no
 * `Max-Age` are emitted: the cookie is host-only and is a browser-session
 * cookie, with the real lifetime governed by `admin_sessions.expires_at`.
 */
export function serialiseSessionCookie(name: string, token: string, secure: boolean): string {
    const attributes = [`${name}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", "Priority=High"];

    if (secure) {
        attributes.push("Secure");
    }

    return attributes.join("; ");
}

/** Serialises the cookie used to clear the session. */
export function serialiseClearedSessionCookie(name: string, secure: boolean): string {
    const attributes = [
        `${name}=`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=0",
        "Priority=High",
    ];

    if (secure) {
        attributes.push("Secure");
    }

    return attributes.join("; ");
}
