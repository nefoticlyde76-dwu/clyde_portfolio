import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import type { Context } from "@netlify/functions";
import { NetlifyDB } from "@netlify/database-dev";

import { getDb, withTransaction, type TransactionClient } from "../netlify/lib/database.mts";
import { deriveCsrfToken, isWellFormedCsrfToken, verifyCsrfToken } from "../netlify/lib/auth/csrf.mts";
import { sha256Hex } from "../netlify/lib/auth/crypto.mts";
import { getAuthConfig } from "../netlify/lib/auth/config.mts";
import {
    emptyResponse,
    parseCookieHeader,
    readCookieValue,
    readJsonBody,
    serialiseClearedSessionCookie,
    serialiseSessionCookie,
    toErrorResponse,
} from "../netlify/lib/auth/http.mts";
import { assertTrustedOrigin, parseOrigin } from "../netlify/lib/auth/origin.mts";
import { provisionFirstAdmin, verifySetupToken } from "../netlify/lib/auth/provisioning.mts";
import {
    checkLoginRateLimit,
    clearLoginAttempts,
    identityBucketKey,
    ipBucketKey,
    recordLoginFailure,
    releaseLoginRateLimitReservation,
    sweepOldLoginAttempts,
} from "../netlify/lib/auth/rate-limit.mts";
import {
    hashSessionToken,
    isSessionTokenShaped,
    issueSession,
    resolveSession,
    revokeSessionByRawToken,
} from "../netlify/lib/auth/sessions.mts";
import {
    isValidLoginIdentifier,
    normaliseLoginIdentifier,
    validateEmail,
    validatePassword,
} from "../netlify/lib/auth/validation.mts";
import {
    ARGON2_ALGORITHM,
    ARGON2_VERSION,
    hashPassword,
    needsRehash,
    verifyPassword,
} from "../netlify/lib/auth/password.mts";
import setupAdmin from "../netlify/functions/admin/setup.mts";
import loginAdmin from "../netlify/functions/admin/auth/login.mts";
import meAdmin from "../netlify/functions/admin/auth/me.mts";
import logoutAdmin from "../netlify/functions/admin/auth/logout.mts";

const temporaryDb = new NetlifyDB({ logger: () => undefined });
const originalEnv = new Map(
    ["NETLIFY_DB_URL", "NETLIFY_DB_DRIVER", "APP_ENV", "SITE_ORIGIN", "SESSION_SECRET", "ADMIN_SETUP_TOKEN"].map(
        (name) => [name, process.env[name]],
    ),
);
let isolatedConnectionString: string | undefined;
let adminEmail = "";
let adminPassword = "";

const contextFor = (ip: string): Context => ({ ip }) as Context;

const setupRequest = (
    body: Record<string, unknown>,
    ip = "192.0.2.10",
    origin = "https://portfolio.test",
): [Request, Context] => [
    new Request("https://portfolio.test/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify(body),
    }),
    contextFor(ip),
];

const loginRequest = (
    body: Record<string, unknown>,
    ip = "192.0.2.20",
    origin = "https://portfolio.test",
): [Request, Context] => [
    new Request("https://portfolio.test/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify(body),
    }),
    contextFor(ip),
];

async function rowCount(
    table: "admins" | "admin_sessions" | "login_attempts" | "login_rate_limit_buckets",
): Promise<number> {
    return withTransaction(async (client) => {
        const result = await client.query<{ total: string }>(
            `SELECT count(*)::text AS total FROM ${table}`,
        );

        return Number(result.rows[0]?.total ?? "-1");
    });
}

async function countBucket(bucket: string): Promise<number> {
    return withTransaction(async (client) => {
        const result = await client.query<{ total: string }>(
            "SELECT count(*)::text AS total FROM login_attempts WHERE identifier = $1",
            [bucket],
        );

        return Number(result.rows[0]?.total ?? "-1");
    });
}

async function attemptRateLimit(
    buckets: { readonly ip: string; readonly identity: string },
): Promise<boolean> {
    return withTransaction(async (client) => {
        const decision = await checkLoginRateLimit(client, getAuthConfig(), buckets);

        if (decision.allowed) {
            await recordLoginFailure(client, buckets, getAuthConfig());
        }

        return decision.allowed;
    });
}

async function clearTestData(client?: TransactionClient): Promise<void> {
    const clear = async (tx: TransactionClient): Promise<void> => {
        await tx.query("DELETE FROM admin_sessions");
        await tx.query("DELETE FROM login_attempts");
        await tx.query("DELETE FROM login_rate_limit_buckets");
        await tx.query("DELETE FROM admins");
        await tx.query("UPDATE admin_setup_guard SET completed_at = NULL WHERE id = 1");
    };

    if (client !== undefined) {
        await clear(client);
        return;
    }

    await withTransaction(clear);
}

before(async () => {
    isolatedConnectionString = await temporaryDb.start();
    process.env.NETLIFY_DB_URL = isolatedConnectionString;
    process.env.NETLIFY_DB_DRIVER = "server";
    process.env.APP_ENV = "production";
    process.env.SITE_ORIGIN = "https://portfolio.test";
    process.env.SESSION_SECRET = randomBytes(32).toString("base64url");
    process.env.ADMIN_SETUP_TOKEN = randomBytes(32).toString("base64url");
    adminEmail = `auth-test-${randomBytes(8).toString("hex")}@example.test`;
    adminPassword = `Test-${randomBytes(20).toString("base64url")}`;

    await temporaryDb.applyMigrations(
        fileURLToPath(new URL("../netlify/database/migrations/", import.meta.url)),
    );

});

after(async () => {
    try {
        await clearTestData();
        assert.equal(await rowCount("admins"), 0);
        assert.equal(await rowCount("admin_sessions"), 0);
        assert.equal(await rowCount("login_attempts"), 0);
        assert.equal(await rowCount("login_rate_limit_buckets"), 0);
        await getDb().pool.end();
    } finally {
        await temporaryDb.stop();

        for (const [name, value] of originalEnv) {
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        }
    }
});

test("administrator authentication security controls", async (t) => {
    await t.test("Argon2id hashes and verifies passwords with explicit parameters", async () => {
        const startedAt = performance.now();
        const firstHash = await hashPassword(adminPassword);
        const hashMs = performance.now() - startedAt;
        const verifyStartedAt = performance.now();

        assert.match(firstHash, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
        assert.equal(await verifyPassword(firstHash, adminPassword), true);
        const verifyMs = performance.now() - verifyStartedAt;
        assert.equal(await verifyPassword(firstHash, `${adminPassword}wrong`), false);
        assert.equal(await verifyPassword("not-a-phc-hash", adminPassword), false);
        assert.notEqual(await hashPassword(adminPassword), firstHash);
        assert.equal(needsRehash(firstHash), false);
        assert.equal(needsRehash("malformed hash"), true);

        const argon2 = await import("@node-rs/argon2");
        const parameters = argon2.parseOptions(firstHash);
        assert.deepEqual(
            {
                algorithm: parameters.algorithm,
                version: parameters.version,
                memoryCost: parameters.memoryCost,
                timeCost: parameters.timeCost,
                parallelism: parameters.parallelism,
                outputLen: parameters.outputLen,
                saltLen: parameters.saltLen,
            },
            {
                algorithm: ARGON2_ALGORITHM,
                version: ARGON2_VERSION,
                memoryCost: 19_456,
                timeCost: 2,
                parallelism: 1,
                outputLen: 32,
                saltLen: 16,
            },
        );

        console.log(
            `Argon2id Windows x64 Node ${process.version}: hash ${hashMs.toFixed(1)} ms, verify ${verifyMs.toFixed(1)} ms`,
        );
    });

    await t.test("password validation enforces length without trimming", () => {
        assert.equal(validatePassword("short-pass").ok, false);
        assert.equal(validatePassword("valid-password").ok, true);
        assert.equal(validatePassword("x".repeat(129)).ok, false);
        assert.deepEqual(validatePassword("            "), { ok: true, value: "            " });
        assert.equal(validatePassword(123).ok, false);
    });

    await t.test("login identifier validation matches PHP normalisation", () => {
        assert.equal(normaliseLoginIdentifier("  ADMIN@Example.com\t"), "admin@example.com");
        assert.equal(isValidLoginIdentifier("admin@example.com"), true);
        assert.equal(isValidLoginIdentifier("clyde-admin"), true);
        assert.equal(isValidLoginIdentifier("bad identifier"), false);
        assert.deepEqual(validateEmail(" ADMIN@Example.com "), {
            ok: true,
            value: "admin@example.com",
        });
        assert.equal(validateEmail("x".repeat(191) + "@example.com").ok, false);
    });

    await t.test("production configuration fails closed and accepts only bare HTTPS origins", () => {
        assert.equal(parseOrigin("https://portfolio.test/admin"), null);
        assert.equal(parseOrigin("https://portfolio.test"), "https://portfolio.test");
        assert.equal(parseOrigin("https://user:pass@portfolio.test"), null);
        assert.equal(parseOrigin("https://portfolio.test?next=/"), null);

        const config = getAuthConfig();
        assert.equal(config.isProduction, true);
        assert.equal(config.cookieSecure, true);
        assert.equal(config.siteOrigin, "https://portfolio.test");

        process.env.SITE_ORIGIN = "http://portfolio.test";
        assert.throws(() => getAuthConfig());
        process.env.SITE_ORIGIN = "https://portfolio.test/admin";
        assert.throws(() => getAuthConfig());
        process.env.SITE_ORIGIN = "https://portfolio.test";
    });

    await t.test("Origin checks reject missing, malformed, cross-origin and path-bearing origins", () => {
        const config = getAuthConfig();

        assert.doesNotThrow(() =>
            assertTrustedOrigin(
                new Request("https://portfolio.test/api", { headers: { Origin: config.siteOrigin } }),
                config,
            ),
        );
        assert.throws(
            () => assertTrustedOrigin(new Request("https://portfolio.test/api"), config),
            { message: /missing its origin/ },
        );
        assert.throws(
            () =>
                assertTrustedOrigin(
                    new Request("https://portfolio.test/api", {
                        headers: { Origin: "https://portfolio.test.evil.test" },
                    }),
                    config,
                ),
            { message: /did not come from/ },
        );
        assert.throws(
            () =>
                assertTrustedOrigin(
                    new Request("https://portfolio.test/api", {
                        headers: { Origin: "https://portfolio.test/admin" },
                    }),
                    config,
                ),
            { message: /missing its origin/ },
        );
        assert.throws(
            () =>
                assertTrustedOrigin(
                    new Request("https://portfolio.test/api", {
                        headers: { Origin: config.siteOrigin, "Sec-Fetch-Site": "cross-site" },
                    }),
                    config,
                ),
            { message: /did not come from/ },
        );
    });

    await t.test("session and cookie tokens are random, hashed at rest, and host-only", () => {
        const token = randomBytes(32).toString("base64url");
        const cookieName = "__Host-clyde_admin_session";
        const cookie = serialiseSessionCookie(cookieName, token, true);

        assert.equal(isSessionTokenShaped(token), true);
        assert.equal(isSessionTokenShaped("short"), false);
        assert.equal(hashSessionToken(token), sha256Hex(token));
        assert.equal(hashSessionToken(token).length, 64);
        assert.equal(cookie.includes(token), true);
        assert.match(cookie, /HttpOnly/);
        assert.match(cookie, /Secure/);
        assert.match(cookie, /SameSite=Lax/);
        assert.match(cookie, /Path=\//);
        assert.doesNotMatch(cookie, /Domain=/i);
        assert.doesNotMatch(serialiseSessionCookie("clyde_admin_session", token, false), /Secure/);
        assert.match(serialiseClearedSessionCookie(cookieName, true), /Max-Age=0/);
        assert.deepEqual(parseCookieHeader(`a=1; ${cookieName}=${token}`).get(cookieName), token);
        assert.equal(
            readCookieValue(
                new Request("https://portfolio.test", { headers: { Cookie: `${cookieName}=${token}` } }),
                cookieName,
            ),
            token,
        );
    });

    await t.test("CSRF tokens are session-bound and reject missing, malformed, and wrong values", () => {
        const secret = randomBytes(32).toString("base64url");
        const firstSession = randomBytes(32).toString("base64url");
        const secondSession = randomBytes(32).toString("base64url");
        const firstToken = deriveCsrfToken(secret, firstSession);

        assert.equal(isWellFormedCsrfToken(firstToken), true);
        assert.equal(verifyCsrfToken(firstToken, firstToken), true);
        assert.equal(verifyCsrfToken(firstToken, null), false);
        assert.equal(verifyCsrfToken(firstToken, "invalid"), false);
        assert.equal(
            verifyCsrfToken(firstToken, deriveCsrfToken(secret, secondSession)),
            false,
        );
        assert.notEqual(firstToken, deriveCsrfToken(secret, secondSession));
    });

    await t.test("setup token comparison is safe and requires equal-length matches", () => {
        const token = randomBytes(32).toString("base64url");

        assert.equal(verifySetupToken(token, token), true);
        assert.equal(verifySetupToken(token, `${token}x`), false);
        assert.equal(verifySetupToken(token, null), false);
        assert.equal(verifySetupToken(null, token), false);
    });

    await t.test("HTTP helpers enforce JSON media type and no-store security headers", async () => {
        const body = await readJsonBody(
            new Request("https://portfolio.test/api", {
                method: "POST",
                headers: { "Content-Type": "application/json; charset=utf-8" },
                body: JSON.stringify({ ok: true }),
            }),
        );
        assert.deepEqual(body, { ok: true, value: { ok: true } });

        const invalidMediaType = await readJsonBody(
            new Request("https://portfolio.test/api", {
                method: "POST",
                headers: { "Content-Type": "application/jsonp" },
                body: "{}",
            }),
        );
        assert.equal(invalidMediaType.ok, false);

        const failure = toErrorResponse(new Error("private database detail"));
        assert.equal(failure.status, 500);
        assert.equal(failure.headers.get("Cache-Control"), "no-store");
        assert.equal(failure.headers.get("X-Frame-Options"), "DENY");
        assert.doesNotMatch(await failure.text(), /private database detail/);

        const noContent = emptyResponse(204);
        assert.equal(noContent.status, 204);
        assert.equal(noContent.headers.get("Content-Type"), null);
        assert.equal(noContent.headers.get("Cache-Control"), "no-store");
    });

    await t.test("session lifecycle enforces expiry, token hashing, rotation, and concurrent sessions", async () => {
        const provisioned = await provisionFirstAdmin({
            name: "Test Administrator",
            email: adminEmail,
            password: adminPassword,
        });
        assert.equal(provisioned.status, "created");
        if (provisioned.status !== "created") {
            return;
        }

        const auth = getAuthConfig();
        const first = await withTransaction((client) =>
            issueSession(client, provisioned.admin.id, auth),
        );
        const second = await withTransaction((client) =>
            issueSession(client, provisioned.admin.id, auth),
        );
        assert.notEqual(first.rawToken, second.rawToken);
        assert.equal(await rowCount("admin_sessions"), 2);

        const stored = await withTransaction(async (client) => {
            const result = await client.query<{ token_hash: string }>(
                "SELECT token_hash FROM admin_sessions WHERE token_hash = $1",
                [hashSessionToken(first.rawToken)],
            );
            return result.rows[0]?.token_hash;
        });
        assert.equal(stored, hashSessionToken(first.rawToken));
        assert.notEqual(stored, first.rawToken);

        const resolved = await withTransaction((client) => resolveSession(client, first.rawToken, auth));
        assert.equal(resolved?.admin.email, adminEmail);
        assert.equal(resolved?.lastUsed instanceof Date, true);
        assert.equal(await withTransaction((client) => resolveSession(client, "x".repeat(43), auth)), null);

        await withTransaction((client) =>
            client.query("UPDATE admin_sessions SET expires_at = now() - interval '1 second' WHERE token_hash = $1", [
                hashSessionToken(first.rawToken),
            ]),
        );
        assert.equal(await withTransaction((client) => resolveSession(client, first.rawToken, auth)), null);

        await withTransaction((client) =>
            client.query("UPDATE admin_sessions SET last_used = now() - interval '30 minutes' WHERE token_hash = $1", [
                hashSessionToken(second.rawToken),
            ]),
        );
        assert.equal(await withTransaction((client) => resolveSession(client, second.rawToken, auth)), null);
        assert.equal(await rowCount("admin_sessions"), 0);

        const rotated = await withTransaction((client) =>
            issueSession(client, provisioned.admin.id, auth),
        );
        const anotherDevice = await withTransaction((client) =>
            issueSession(client, provisioned.admin.id, auth),
        );
        assert.equal(await withTransaction((client) => revokeSessionByRawToken(client, rotated.rawToken)), 1);
        assert.equal(await withTransaction((client) => resolveSession(client, rotated.rawToken, auth)), null);
        assert.notEqual(
            await withTransaction((client) => resolveSession(client, anotherDevice.rawToken, auth)),
            null,
        );
        await withTransaction((client) => revokeSessionByRawToken(client, anotherDevice.rawToken));
        assert.equal(await rowCount("admin_sessions"), 0);
    });

    await t.test("one-time setup rejects invalid tokens and serializes simultaneous provisioning", async () => {
        await clearTestData();
        const setupToken = process.env.ADMIN_SETUP_TOKEN ?? "";
        const password = `Setup-${randomBytes(20).toString("base64url")}`;
        const invalid = setupRequest({
            name: "Test Administrator",
            email: adminEmail,
            password,
            setupToken: "wrong",
        });
        const rejected = await setupAdmin(...invalid);
        assert.equal(rejected.status, 401);
        assert.equal(await rowCount("admins"), 0);
        assert.equal(await rowCount("login_attempts"), 2);

        await clearTestData();
        const payloads = [0, 1].map((index) =>
            setupRequest({
                name: `Test Administrator ${index}`,
                email: `setup-${index}-${adminEmail}`,
                password,
                setupToken,
            }, "192.0.2.50"),
        );
        const responses = await Promise.all(payloads.map(([request, context]) => setupAdmin(request, context)));
        assert.deepEqual(
            responses.map((response) => response.status).sort((left, right) => left - right),
            [201, 410],
        );
        assert.equal(await rowCount("admins"), 1);
        assert.equal(await rowCount("admin_sessions"), 0);
    });

    await t.test("setup endpoint is unavailable without its secret and enforces method and Origin", async () => {
        await clearTestData();
        const token = process.env.ADMIN_SETUP_TOKEN;
        delete process.env.ADMIN_SETUP_TOKEN;
        const unavailable = await setupAdmin(
            new Request("https://portfolio.test/api/admin/setup", { method: "POST" }),
            contextFor("192.0.2.60"),
        );
        assert.equal(unavailable.status, 404);
        process.env.ADMIN_SETUP_TOKEN = token;

        const wrongMethod = await setupAdmin(
            new Request("https://portfolio.test/api/admin/setup", { method: "GET" }),
            contextFor("192.0.2.60"),
        );
        assert.equal(wrongMethod.status, 405);

        const missingOrigin = await setupAdmin(
            new Request("https://portfolio.test/api/admin/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json", Referer: "https://portfolio.test/" },
                body: "{}",
            }),
            contextFor("192.0.2.60"),
        );
        assert.equal(missingOrigin.status, 403);
    });

    await t.test("login, /me, logout, generic failures, CSRF, and cookie responses work end-to-end", async () => {
        await clearTestData();
        const setupToken = process.env.ADMIN_SETUP_TOKEN ?? "";
        const provisioned = await setupAdmin(
            ...setupRequest({
                name: "Test Administrator",
                email: adminEmail,
                password: adminPassword,
                setupToken,
            }, "192.0.2.70"),
        );
        assert.equal(provisioned.status, 201);

        const wrong = await loginAdmin(
            ...loginRequest({ email: adminEmail, password: `${adminPassword}wrong` }, "192.0.2.71"),
        );
        const unknown = await loginAdmin(
            ...loginRequest({ email: `missing-${adminEmail}`, password: adminPassword }, "192.0.2.72"),
        );
        assert.equal(wrong.status, 401);
        assert.equal(unknown.status, 401);
        assert.equal(await wrong.text(), await unknown.text());

        const missingOrigin = await loginAdmin(
            new Request("https://portfolio.test/api/admin/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json", Referer: "https://portfolio.test/" },
                body: JSON.stringify({ email: adminEmail, password: adminPassword }),
            }),
            contextFor("192.0.2.73"),
        );
        assert.equal(missingOrigin.status, 403);

        const success = await loginAdmin(
            ...loginRequest({ email: adminEmail, password: adminPassword }, "192.0.2.74"),
        );
        assert.equal(success.status, 200);
        assert.equal(success.headers.get("Cache-Control"), "no-store");
        assert.match(success.headers.get("Set-Cookie") ?? "", /^__Host-clyde_admin_session=/);
        assert.match(success.headers.get("Set-Cookie") ?? "", /HttpOnly/);
        assert.match(success.headers.get("Set-Cookie") ?? "", /Secure/);
        assert.match(success.headers.get("Set-Cookie") ?? "", /SameSite=Lax/);
        assert.match(success.headers.get("Set-Cookie") ?? "", /Path=\//);
        assert.doesNotMatch(success.headers.get("Set-Cookie") ?? "", /Domain=/i);
        const sessionToken = parseCookieHeader(success.headers.get("Set-Cookie")).get(
            "__Host-clyde_admin_session",
        );
        assert.ok(sessionToken);

        const successBody = (await success.json()) as {
            admin: { id: number; name: string; email: string; password_hash?: string };
            csrfToken: string;
        };
        assert.equal(successBody.admin.email, adminEmail);
        assert.equal("password_hash" in successBody.admin, false);
        assert.equal(isWellFormedCsrfToken(successBody.csrfToken), true);
        assert.equal(await rowCount("admin_sessions"), 1);

        const meRequest = new Request("https://portfolio.test/api/admin/auth/me", {
            headers: { Cookie: `__Host-clyde_admin_session=${sessionToken}` },
        });
        const me = await meAdmin(meRequest);
        assert.equal(me.status, 200);
        const meBody = (await me.json()) as { admin: { email: string }; csrfToken: string };
        assert.equal(meBody.admin.email, adminEmail);
        assert.equal(meBody.csrfToken, successBody.csrfToken);

        const unauthenticated = await meAdmin(new Request("https://portfolio.test/api/admin/auth/me"));
        assert.equal(unauthenticated.status, 401);
        const wrongMethod = await meAdmin(
            new Request("https://portfolio.test/api/admin/auth/me", { method: "POST" }),
        );
        assert.equal(wrongMethod.status, 405);

        const missingCsrf = await logoutAdmin(
            new Request("https://portfolio.test/api/admin/auth/logout", {
                method: "POST",
                headers: {
                    Cookie: `__Host-clyde_admin_session=${sessionToken}`,
                    Origin: "https://portfolio.test",
                },
            }),
        );
        assert.equal(missingCsrf.status, 403);
        assert.equal((await missingCsrf.json()).error, "csrf_missing");

        const invalidCsrf = await logoutAdmin(
            new Request("https://portfolio.test/api/admin/auth/logout", {
                method: "POST",
                headers: {
                    Cookie: `__Host-clyde_admin_session=${sessionToken}`,
                    Origin: "https://portfolio.test",
                    "X-CSRF-Token": randomBytes(32).toString("base64url"),
                },
            }),
        );
        assert.equal(invalidCsrf.status, 403);

        const loggedOut = await logoutAdmin(
            new Request("https://portfolio.test/api/admin/auth/logout", {
                method: "POST",
                headers: {
                    Cookie: `__Host-clyde_admin_session=${sessionToken}`,
                    Origin: "https://portfolio.test",
                    "X-CSRF-Token": successBody.csrfToken,
                },
            }),
        );
        assert.equal(loggedOut.status, 204);
        assert.match(loggedOut.headers.get("Set-Cookie") ?? "", /Max-Age=0/);
        assert.equal(await rowCount("admin_sessions"), 0);
        assert.equal(
            (
                await meAdmin(
                    new Request("https://portfolio.test/api/admin/auth/me", {
                        headers: { Cookie: `__Host-clyde_admin_session=${sessionToken}` },
                    }),
                )
            ).status,
            401,
        );
    });

    await t.test("login endpoint returns 429 on the sixth failure and clears failures on success", async () => {
        await clearTestData();
        const provisioned = await provisionFirstAdmin({
            name: "Test Administrator",
            email: adminEmail,
            password: adminPassword,
        });
        assert.equal(provisioned.status, "created");

        const ip = "192.0.2.80";
        const failures = await Promise.all(
            Array.from({ length: 5 }, () =>
                loginAdmin(...loginRequest({ email: adminEmail, password: "incorrect-password" }, ip)),
            ),
        );
        assert.equal(failures.every((response) => response.status === 401), true);
        const limited = await loginAdmin(
            ...loginRequest({ email: adminEmail, password: "incorrect-password" }, ip),
        );
        assert.equal(limited.status, 429);
        assert.ok(Number(limited.headers.get("Retry-After")) > 0);
        assert.equal(await countBucket(ipBucketKey(ip)), 5);

        await clearTestData();
        const identity = identityBucketKey(adminEmail);
        const sharedIp = ipBucketKey("192.0.2.81");
        for (let attempt = 0; attempt < 10; attempt += 1) {
            assert.equal(
                await attemptRateLimit({
                    ip: ipBucketKey(`192.0.2.${100 + attempt}`),
                    identity,
                }),
                true,
            );
        }
        assert.equal(await attemptRateLimit({ ip: ipBucketKey("192.0.2.82"), identity }), false);

        await clearTestData();
        const buckets = {
            ip: ipBucketKey("192.0.2.83"),
            identity: identityBucketKey(adminEmail),
        };
        for (let attempt = 0; attempt < 2; attempt += 1) {
            assert.equal(await attemptRateLimit(buckets), true);
        }
        await withTransaction(async (client) => {
            const decision = await checkLoginRateLimit(client, getAuthConfig(), buckets);
            assert.equal(decision.allowed, true);
            await clearLoginAttempts(client, buckets);
        });
        assert.equal(await countBucket(buckets.ip), 0);
        assert.equal(await countBucket(buckets.identity), 0);

        const expiredIp = ipBucketKey("192.0.2.84");
        const expiredBuckets = { ip: expiredIp, identity: identityBucketKey("old-attempts@example.test") };
        const staleBucket = ipBucketKey("192.0.2.85");
        const inFlightBucket = ipBucketKey("192.0.2.86");
        await withTransaction(async (client) => {
            await client.query(
                "INSERT INTO login_attempts (identifier, attempted_at) VALUES ($1, now() - interval '25 hours')",
                [expiredIp],
            );
            await client.query(
                `INSERT INTO login_rate_limit_buckets (identifier, updated_at)
                 VALUES ($1, now() - interval '25 hours')`,
                [staleBucket],
            );
            await client.query(
                `INSERT INTO login_rate_limit_buckets (identifier, in_flight, updated_at)
                 VALUES ($1, 1, now() - interval '25 hours')`,
                [inFlightBucket],
            );
            await sweepOldLoginAttempts(client, getAuthConfig());
        });
        assert.equal(await countBucket(expiredIp), 0);
        const retainedInFlight = await withTransaction(async (client) => {
            const result = await client.query<{ total: string }>(
                "SELECT count(*)::text AS total FROM login_rate_limit_buckets WHERE identifier = $1",
                [inFlightBucket],
            );

            return Number(result.rows[0]?.total ?? "-1");
        });
        assert.equal(retainedInFlight, 1);
        const removedStale = await withTransaction(async (client) => {
            const result = await client.query<{ total: string }>(
                "SELECT count(*)::text AS total FROM login_rate_limit_buckets WHERE identifier = $1",
                [staleBucket],
            );

            return Number(result.rows[0]?.total ?? "-1");
        });
        assert.equal(removedStale, 0);
        assert.equal(await attemptRateLimit(expiredBuckets), true);
    });

    await t.test("concurrent rate-limit transactions cannot exceed the IP threshold", async () => {
        await clearTestData();
        const sharedIp = ipBucketKey("192.0.2.90");
        const results = await Promise.all(
            Array.from({ length: 12 }, (_, index) =>
                attemptRateLimit({
                    ip: sharedIp,
                    identity: identityBucketKey(`parallel-${index}@example.test`),
                }),
            ),
        );

        assert.equal(results.filter(Boolean).length, 5);
        assert.equal(results.filter((allowed) => !allowed).length, 7);
        assert.equal(await countBucket(sharedIp), 5);
    });

    await t.test("concurrent identity throttling releases reservations for refused requests", async () => {
        await clearTestData();
        const sharedIdentity = identityBucketKey("parallel-identity@example.test");
        const results = await Promise.all(
            Array.from({ length: 12 }, (_, index) =>
                attemptRateLimit({
                    ip: ipBucketKey(`198.51.100.${index + 1}`),
                    identity: sharedIdentity,
                }),
            ),
        );

        assert.equal(results.filter(Boolean).length, 10);
        assert.equal(results.filter((allowed) => !allowed).length, 2);
        assert.equal(await countBucket(sharedIdentity), 10);

        const reservations = await withTransaction(async (client) => {
            const result = await client.query<{ total: string }>(
                `SELECT coalesce(sum(in_flight), 0)::text AS total
                   FROM login_rate_limit_buckets`,
            );

            return Number(result.rows[0]?.total ?? "-1");
        });
        assert.equal(reservations, 0);
    });

    await t.test("test adapter is isolated and leaves no auth records", async () => {
        assert.ok(isolatedConnectionString);
        await clearTestData();
        assert.equal(await rowCount("admins"), 0);
        assert.equal(await rowCount("admin_sessions"), 0);
        assert.equal(await rowCount("login_attempts"), 0);
    });
});
