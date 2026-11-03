import { getStore } from "@netlify/blobs";

import {
    CONTENT_RESOURCES,
    allowedExperienceTypes,
    allowedSkillCategories,
    deleteAdminRecord,
    getAdminRecord,
    getProfile,
    isContentResource,
    isMediaReferenceInUse,
    listAdminRecords,
    mediaFieldsFor,
    parseMediaKey,
    readRecordId,
    saveProfile,
    validateProfile,
    validateRecord,
    writeRecord,
    type ContentResource,
} from "../lib/content.mts";
import { withTransaction } from "../lib/database.mts";
import { HttpError, jsonResponse, toErrorResponse } from "../lib/auth/http.mts";
import { deriveCsrfToken } from "../lib/auth/csrf.mts";
import {
    assertMethod,
    loadAuthConfig,
    requireAdminSession,
    requireCsrf,
    requireOrigin,
} from "../lib/auth/guards.mts";
import { assertSecureTransport } from "../lib/auth/origin.mts";

export const config = { path: "/api/admin/content" };

const MAX_BODY_BYTES = 128 * 1024;
const DEFAULT_PAGE_SIZE = 20;

export default async function adminContent(request: Request): Promise<Response> {
    let pendingKeys: string[] = [];
    try {
        const auth = loadAuthConfig();
        const method = request.method.toUpperCase();
        assertMethod(request, ["GET", "POST", "PATCH", "DELETE"]);
        if (method !== "GET") {
            assertSecureTransport(request, auth);
            requireOrigin(request, auth);
        }

        const session = await requireAdminSession(request, auth);
        if (method !== "GET") {
            requireCsrf(request, auth, session);
        }

        const url = new URL(request.url);
        const resourceValue = url.searchParams.get("resource");
        const idValue = url.searchParams.get("id");
        const resource = isContentResource(resourceValue) ? resourceValue : null;
        if (resource === null && resourceValue !== "profile" && resourceValue !== "overview") {
            throw new HttpError(400, "invalid_resource", "Choose a supported dashboard section.");
        }

        if (method === "GET") {
            if (resourceValue === "overview") {
                return await readOverview();
            }
            if (resourceValue === "profile") {
                const profile = await withTransaction(getProfile);
                return jsonResponse(200, {
                    profile,
                    csrfToken: deriveCsrfToken(auth.sessionSecret, session.rawToken),
                });
            }
            if (resource === null) {
                throw new HttpError(400, "invalid_resource", "Choose a supported dashboard section.");
            }
            if (idValue !== null) {
                const id = readRecordId(idValue);
                if (id === null) {
                    throw new HttpError(400, "invalid_id", "Choose a valid record.");
                }
                const item = await withTransaction((client) => getAdminRecord(client, resource, id));
                if (item === null) {
                    throw new HttpError(404, "record_not_found", "That record could not be found.");
                }
                return jsonResponse(200, { item });
            }
            const page = parsePositiveInteger(url.searchParams.get("page"), 1, 100_000);
            const pageSize = parsePositiveInteger(url.searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, 50);
            const listing = await withTransaction((client) =>
                listAdminRecords(
                    client,
                    resource,
                    page,
                    pageSize,
                    url.searchParams.get("q") ?? "",
                    url.searchParams.get("status") ?? "",
                    url.searchParams.get("category") ?? "",
                    url.searchParams.get("read") ?? "",
                ),
            );
            return jsonResponse(200, listing);
        }

        const body = method === "DELETE" ? {} : await readRequestObject(request);
        pendingKeys = readPendingKeys(body.pendingMedia);
        if (pendingKeys.length > 0 && (method === "DELETE" || resourceValue === "messages")) {
            throw new HttpError(400, "invalid_media", "This operation cannot use uploaded media.");
        }

        if (resourceValue === "profile") {
            if (method !== "POST" && method !== "PATCH") {
                throw new HttpError(405, "method_not_allowed", "Use POST or PATCH for profile settings.");
            }
            const outcome = await withTransaction(async (client) => {
                const previous = await getProfile(client);
                const record = validateProfile(body.record, previous);
                await saveProfile(client, record);
                return {
                    previous,
                    profile: await getProfile(client),
                    record,
                };
            });
            const cleanupWarnings = await removeNoLongerReferenced([
                outcome.previous?.profile_image_path,
                outcome.previous?.resume_path,
            ], [outcome.record.profile_image_path, outcome.record.resume_path]);
            cleanupWarnings.push(...await removeUnreferencedPending(
                pendingKeys,
                [outcome.record.profile_image_path, outcome.record.resume_path],
            ));
            pendingKeys = [];
            return jsonResponse(200, { profile: outcome.profile, cleanupWarnings });
        }

        if (resource === null) {
            throw new HttpError(400, "invalid_resource", "Choose a supported dashboard section.");
        }
        if (resource === "messages") {
            return await updateMessage(request, resource, idValue, body);
        }

        if (method === "POST") {
            const record = await validateRequestRecord(resource, body.record);
            await assertUniqueRecord(resource, record, null);
            const id = await withTransaction((client) => writeRecord(client, resource, null, record));
            const cleanupWarnings = await removeUnreferencedPending(
                pendingKeys,
                newMediaReferences(resource, record),
            );
            pendingKeys = [];
            return jsonResponse(201, { item: await readAfterWrite(resource, id), cleanupWarnings });
        }

        if (method === "PATCH") {
            const id = requireRecordId(idValue);
            const previous = await withTransaction((client) => getAdminRecord(client, resource, id));
            if (previous === null) {
                throw new HttpError(404, "record_not_found", "That record could not be found.");
            }
            const record = await validateRequestRecord(
                resource,
                body.record,
                typeof previous.experience_type === "string" ? previous.experience_type : null,
            );
            await assertUniqueRecord(resource, record, id);
            await withTransaction((client) => writeRecord(client, resource, id, record));
            const cleanupWarnings = await removeNoLongerReferenced(
                oldMediaReferences(resource, previous),
                newMediaReferences(resource, record),
            );
            cleanupWarnings.push(...await removeUnreferencedPending(
                pendingKeys,
                newMediaReferences(resource, record),
            ));
            pendingKeys = [];
            return jsonResponse(200, { item: await readAfterWrite(resource, id), cleanupWarnings });
        }

        const id = requireRecordId(idValue);
        const previous = await withTransaction((client) => deleteAdminRecord(client, resource, id));
        const cleanupWarnings = await removeNoLongerReferenced(
            oldMediaReferences(resource, previous),
            null,
        );
        return jsonResponse(200, { deleted: true, cleanupWarnings });
    } catch (error) {
        if (pendingKeys.length > 0) {
            await deletePendingMedia(pendingKeys);
        }
        if (isUniqueViolation(error)) {
            return jsonResponse(409, {
                error: "duplicate_record",
                message: "A record with the same unique value already exists.",
            });
        }
        if (!(error instanceof HttpError)) {
            console.error("Admin content request failed.", error instanceof Error ? error.message : "Unknown error");
        }
        return toErrorResponse(error);
    }
}

async function updateMessage(
    request: Request,
    resource: ContentResource,
    idValue: string | null,
    body: Record<string, unknown>,
): Promise<Response> {
    if (request.method.toUpperCase() === "DELETE") {
        const id = requireRecordId(idValue);
        const previous = await withTransaction((client) => deleteAdminRecord(client, resource, id));
        return jsonResponse(200, { deleted: true, item: previous });
    }
    if (request.method.toUpperCase() !== "PATCH") {
        throw new HttpError(405, "method_not_allowed", "Messages can only be updated or deleted.");
    }
    const id = requireRecordId(idValue);
    const patch = validateRecord(resource, body.record);
    await withTransaction((client) =>
        client.query<{ id: number }>(
            "UPDATE contact_messages SET is_read = $1 WHERE id = $2 RETURNING id",
            [patch.is_read, id],
        ),
    );
    const item = await withTransaction((client) => getAdminRecord(client, resource, id));
    if (item === null) {
        throw new HttpError(404, "record_not_found", "That message could not be found.");
    }
    return jsonResponse(200, { item });
}

async function readOverview(): Promise<Response> {
    const overview = await withTransaction(async (client) => {
        const counts = await client.query<Record<string, string>>(
            `SELECT
                (SELECT count(*) FROM projects WHERE status = 'published')::text AS projects_published,
                (SELECT count(*) FROM projects WHERE status = 'draft')::text AS projects_draft,
                (SELECT count(*) FROM certificates)::text AS certificates,
                (SELECT count(*) FROM design_items)::text AS design_items,
                (SELECT count(*) FROM skills)::text AS skills,
                (SELECT count(*) FROM experiences)::text AS experiences,
                (SELECT count(*) FROM contact_messages WHERE is_read = false)::text AS unread_messages`,
        );
        const projects = await client.query(
            "SELECT id, title, status, updated_at FROM projects ORDER BY updated_at DESC, id DESC LIMIT 5",
        );
        const messages = await client.query(
            "SELECT id, sender_name, sender_email, subject, message, is_read, created_at FROM contact_messages ORDER BY created_at DESC, id DESC LIMIT 5",
        );
        return {
            counts: Object.fromEntries(
                Object.entries(counts.rows[0] ?? {}).map(([key, value]) => [key, Number(value)]),
            ),
            projects: projects.rows,
            messages: messages.rows,
        };
    });

    return jsonResponse(200, overview);
}

async function readAfterWrite(resource: ContentResource, id: number): Promise<Record<string, unknown>> {
    const item = await withTransaction((client) => getAdminRecord(client, resource, id));
    if (item === null) {
        throw new Error("A saved record could not be read back.");
    }
    return item;
}

async function validateRequestRecord(
    resource: ContentResource,
    raw: unknown,
    currentExperienceType: string | null = null,
) {
    const options = await withTransaction(async (client) => ({
        categories: resource === "skills" ? await allowedSkillCategories(client) : undefined,
        types: resource === "experience"
            ? await allowedExperienceTypes(client, currentExperienceType)
            : undefined,
    }));
    return validateRecord(
        resource,
        raw,
        options.categories,
        options.types,
    );
}

async function assertUniqueRecord(
    resource: ContentResource,
    record: Record<string, string | number | boolean | null>,
    exceptId: number | null,
): Promise<void> {
    let query: string | null = null;
    let value: unknown[] = [];
    if (resource === "projects") {
        query = `SELECT 1 FROM projects WHERE slug = $1${exceptId === null ? "" : " AND id <> $2"} LIMIT 1`;
        value = exceptId === null ? [record.slug] : [record.slug, exceptId];
    } else if (resource === "skills") {
        query = `SELECT 1 FROM skills WHERE category = $1 AND name = $2${exceptId === null ? "" : " AND id <> $3"} LIMIT 1`;
        value = exceptId === null
            ? [record.category, record.name]
            : [record.category, record.name, exceptId];
    } else if (resource === "certificates" && record.credential_id !== null) {
        query = `SELECT 1 FROM certificates WHERE credential_id = $1${exceptId === null ? "" : " AND id <> $2"} LIMIT 1`;
        value = exceptId === null ? [record.credential_id] : [record.credential_id, exceptId];
    }
    if (query === null) {
        return;
    }
    const duplicate = await withTransaction(async (client) => (await client.query(query, value)).rowCount > 0);
    if (duplicate) {
        const message = resource === "projects"
            ? "That project slug is already in use."
            : resource === "skills"
                ? "That skill already exists in this category."
                : "That credential ID is already in use.";
        throw new HttpError(409, "duplicate_record", message);
    }
}

function oldMediaReferences(
    resource: ContentResource,
    record: Record<string, unknown>,
): unknown[] {
    return mediaFieldsFor(resource).map((field) => record[field]);
}

function newMediaReferences(
    resource: ContentResource,
    record: Record<string, unknown>,
): unknown[] {
    return mediaFieldsFor(resource).map((field) => record[field]);
}

async function removeNoLongerReferenced(
    oldValues: unknown[],
    newValues: unknown[] | null,
): Promise<string[]> {
    const current = new Set((newValues ?? []).map(parseMediaKey).filter((key): key is string => key !== null));
    const keys = new Set(oldValues.map(parseMediaKey).filter((key): key is string => key !== null));
    const warnings: string[] = [];
    for (const key of keys) {
        if (current.has(key)) {
            continue;
        }
        try {
            const referenced = await withTransaction((client) => isMediaReferenceInUse(client, key));
            if (!referenced) {
                await getStore("portfolio-media").delete(key);
            }
        } catch (error) {
            console.error("Saved media cleanup failed.", error instanceof Error ? error.message : "Unknown error");
            warnings.push("A replaced media file could not be removed; contact support before retrying cleanup.");
        }
    }
    return warnings;
}

async function deletePendingMedia(keys: string[]): Promise<void> {
    for (const key of keys) {
        try {
            await getStore("portfolio-media").delete(key);
        } catch (error) {
            console.error("Uncommitted media cleanup failed.", error instanceof Error ? error.message : "Unknown error");
        }
    }
}

async function removeUnreferencedPending(keys: string[], references: unknown[]): Promise<string[]> {
    const referencedByRecord = new Set(
        references.map(parseMediaKey).filter((key): key is string => key !== null),
    );
    const warnings: string[] = [];
    for (const key of keys) {
        if (referencedByRecord.has(key)) {
            continue;
        }
        try {
            const referenced = await withTransaction((client) => isMediaReferenceInUse(client, key));
            if (!referenced) {
                await getStore("portfolio-media").delete(key);
            }
        } catch (error) {
            console.error("Unused media cleanup failed.", error instanceof Error ? error.message : "Unknown error");
            warnings.push("An unused uploaded file could not be removed; contact support before retrying cleanup.");
        }
    }
    return warnings;
}

function readPendingKeys(value: unknown): string[] {
    if (value === undefined) {
        return [];
    }
    if (!Array.isArray(value) || value.length > 4) {
        throw new HttpError(400, "invalid_media", "The pending media list is invalid.");
    }
    const keys = value.map((entry) => {
        const key = parseMediaKey(entry);
        if (key === null) {
            throw new HttpError(400, "invalid_media", "A pending media reference is invalid.");
        }
        return key;
    });
    return [...new Set(keys)];
}

async function readRequestObject(request: Request): Promise<Record<string, unknown>> {
    const declaredLength = request.headers.get("content-length");
    if (declaredLength !== null && Number(declaredLength) > MAX_BODY_BYTES) {
        throw new HttpError(413, "payload_too_large", "The request is too large.");
    }
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
        throw new HttpError(413, "payload_too_large", "The request is too large.");
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new HttpError(400, "invalid_json", "Send a valid JSON object.");
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new HttpError(400, "invalid_payload", "Send a valid JSON object.");
    }
    return parsed as Record<string, unknown>;
}

function parsePositiveInteger(value: string | null, fallback: number, maximum: number): number {
    if (value === null) {
        return fallback;
    }
    if (!/^[1-9]\d{0,6}$/.test(value)) {
        throw new HttpError(400, "invalid_pagination", "Page and page size must be positive whole numbers.");
    }
    return Math.min(Number(value), maximum);
}

function requireRecordId(value: string | null): number {
    const id = readRecordId(value);
    if (id === null) {
        throw new HttpError(400, "invalid_id", "Choose a valid record.");
    }
    return id;
}

function isUniqueViolation(error: unknown): boolean {
    return typeof error === "object"
        && error !== null
        && "code" in error
        && error.code === "23505";
}
