import type { Context } from "@netlify/functions";

import { HttpError, jsonResponse, toErrorResponse } from "../lib/auth/http.mts";
import { parseOrigin } from "../lib/auth/origin.mts";
import { sha256Hex } from "../lib/auth/crypto.mts";
import { withTransaction, type TransactionClient } from "../lib/database.mts";

export const config = { path: "/api/public/contact" };

const MAX_BODY_BYTES = 32 * 1024;
let cleanupCounter = 0;

export default async function publicContact(request: Request, context: Context): Promise<Response> {
    try {
        if (request.method !== "POST") {
            throw new HttpError(405, "method_not_allowed", "Use POST to send a message.", {
                Allow: "POST",
            });
        }
        assertContactOrigin(request);

        const clientIp = typeof context.ip === "string" && context.ip !== "" ? context.ip : "unknown";
        const ipKey = sha256Hex(`contact-ip:${clientIp}`);
        const abuseIpKey = sha256Hex(`contact-abuse-ip:${clientIp}`);
        const abuseAllowed = await withTransaction(async (client) =>
            recordRateLimitHit(client, abuseIpKey, 15 * 60, 20),
        );
        if (!abuseAllowed) {
            return jsonResponse(429, {
                error: "too_many_requests",
                message: "Please wait a few minutes before sending another message.",
            }, { "Retry-After": "900" });
        }

        const body = await readBody(request);
        const website = typeof body.website === "string" ? body.website.trim() : "";
        if (website !== "") {
            throw new HttpError(400, "invalid_submission", "The message could not be submitted.");
        }
        const name = readText(body, "name", 2, 120);
        const email = readText(body, "email", 3, 190).toLowerCase();
        const subject = readText(body, "subject", 3, 180);
        const message = readText(body, "message", 10, 5000)
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
        if (!isEmail(email)) {
            throw new HttpError(400, "invalid_submission", "Enter a valid email address.");
        }

        const emailKey = sha256Hex(`contact-email:${email}`);
        const outcome = await withTransaction(async (client) => {
            const ipAllowed = await recordRateLimitHit(client, ipKey, 15 * 60, 3);
            const emailAllowed = await recordRateLimitHit(client, emailKey, 60 * 60, 5);
            if (!ipAllowed || !emailAllowed) {
                return { limited: true, id: null };
            }

            const result = await client.query<{ id: number }>(
                `INSERT INTO contact_messages (sender_name, sender_email, subject, message, is_read)
                 VALUES ($1, $2, $3, $4, false)
                 RETURNING id`,
                [name, email, subject, message],
            );
            return { limited: false, id: result.rows[0]?.id ?? null };
        });
        if (outcome.limited) {
            return jsonResponse(429, {
                error: "too_many_requests",
                message: "Please wait a few minutes before sending another message.",
            }, { "Retry-After": "900" });
        }
        if (typeof outcome.id !== "number") {
            throw new Error("The contact message insert did not return an ID.");
        }
        await cleanupExpiredBuckets();
        return jsonResponse(201, {
            message: "Your message has been saved. It is not sent by email.",
        });
    } catch (error) {
        if (!(error instanceof HttpError)) {
            console.error("Public contact request failed.", error instanceof Error ? error.message : "Unknown error");
        }
        return toErrorResponse(error);
    }
}

async function recordRateLimitHit(
    client: TransactionClient,
    identifierHash: string,
    windowSeconds: number,
    maximum: number,
): Promise<boolean> {
    const result = await client.query<{ identifier_hash: string }>(
        `INSERT INTO contact_rate_limit_buckets (identifier_hash, window_started_at, hit_count, updated_at)
         VALUES ($1, now(), 1, now())
         ON CONFLICT (identifier_hash) DO UPDATE SET
           window_started_at = CASE
             WHEN contact_rate_limit_buckets.window_started_at <= now() - ($2::integer * interval '1 second')
             THEN now()
             ELSE contact_rate_limit_buckets.window_started_at
           END,
           hit_count = CASE
             WHEN contact_rate_limit_buckets.window_started_at <= now() - ($2::integer * interval '1 second')
             THEN 1
             ELSE contact_rate_limit_buckets.hit_count + 1
           END,
           updated_at = now()
         WHERE contact_rate_limit_buckets.window_started_at <= now() - ($2::integer * interval '1 second')
            OR contact_rate_limit_buckets.hit_count < $3
         RETURNING identifier_hash`,
        [identifierHash, windowSeconds, maximum],
    );
    return result.rows.length === 1;
}

async function cleanupExpiredBuckets(): Promise<void> {
    cleanupCounter++;
    if (cleanupCounter % 100 !== 0) {
        return;
    }
    try {
        await withTransaction((client) =>
            client.query(
                "DELETE FROM contact_rate_limit_buckets WHERE updated_at < now() - interval '24 hours'",
            ),
        );
    } catch (error) {
        console.error("Contact rate-limit cleanup failed.", error instanceof Error ? error.message : "Unknown error");
    }
}

function assertContactOrigin(request: Request): void {
    const configured = parseOrigin(process.env.SITE_ORIGIN);
    const supplied = parseOrigin(request.headers.get("origin"));
    if (configured === null) {
        throw new HttpError(503, "service_unavailable", "The contact form is temporarily unavailable.");
    }
    if (request.headers.get("sec-fetch-site")?.toLowerCase() === "cross-site" || supplied !== configured) {
        throw new HttpError(403, "origin_invalid", "This request did not come from the portfolio site.");
    }
    if (process.env.APP_ENV === "production" && new URL(request.url).protocol !== "https:") {
        throw new HttpError(403, "https_required", "This request must use HTTPS.");
    }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
    const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "application/json") {
        throw new HttpError(415, "unsupported_media_type", "Send the message as JSON.");
    }
    const length = request.headers.get("content-length");
    if (length !== null && Number(length) > MAX_BODY_BYTES) {
        throw new HttpError(413, "payload_too_large", "The message is too large.");
    }
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
        throw new HttpError(413, "payload_too_large", "The message is too large.");
    }
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        throw new HttpError(400, "invalid_json", "Send a valid message.");
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new HttpError(400, "invalid_submission", "Send a valid message.");
    }
    return value as Record<string, unknown>;
}

function readText(
    body: Record<string, unknown>,
    field: string,
    minimum: number,
    maximum: number,
): string {
    const value = body[field];
    if (typeof value !== "string") {
        throw new HttpError(400, "invalid_submission", `Enter a valid ${field}.`);
    }
    const cleaned = value.replace(/\0/g, "").trim();
    if (cleaned.length < minimum || cleaned.length > maximum) {
        throw new HttpError(400, "invalid_submission", `Enter a ${field} using ${minimum} to ${maximum} characters.`);
    }
    return cleaned;
}

function isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
