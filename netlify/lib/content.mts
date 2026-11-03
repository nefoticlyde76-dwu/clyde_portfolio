import { HttpError } from "./auth/http.mts";
import { withTransaction, type TransactionClient } from "./database.mts";

export const CONTENT_RESOURCES = [
    "projects",
    "certificates",
    "designs",
    "skills",
    "experience",
    "messages",
] as const;

export type ContentResource = (typeof CONTENT_RESOURCES)[number];
export type ContentRecord = Record<string, string | number | boolean | null>;

interface ResourceDefinition {
    readonly table: string;
    readonly columns: readonly string[];
    readonly listColumns: readonly string[];
    readonly searchColumns: readonly string[];
    readonly orderBy: string;
}

const RESOURCES: Readonly<Record<ContentResource, ResourceDefinition>> = {
    projects: {
        table: "projects",
        columns: [
            "title", "slug", "category", "summary", "overview", "purpose", "role",
            "contribution", "solution", "description", "technologies", "features",
            "lessons", "live_url", "repository_url", "cover_image_path", "is_featured",
            "status", "display_order",
        ],
        listColumns: ["id", "title", "slug", "category", "summary", "status", "is_featured", "display_order", "updated_at"],
        searchColumns: ["title", "slug", "category"],
        orderBy: "display_order ASC, updated_at DESC, id DESC",
    },
    certificates: {
        table: "certificates",
        columns: [
            "title", "issuing_organization", "issued_on", "credential_url", "credential_id",
            "file_path", "display_image_path", "description", "status", "display_order",
        ],
        listColumns: ["id", "title", "issuing_organization", "issued_on", "status", "display_order", "updated_at"],
        searchColumns: ["title", "issuing_organization", "credential_id"],
        orderBy: "display_order ASC, updated_at DESC, id DESC",
    },
    designs: {
        table: "design_items",
        columns: [
            "title", "category", "description", "image_path", "external_url",
            "is_featured", "status", "display_order",
        ],
        listColumns: ["id", "title", "category", "status", "is_featured", "display_order", "image_path", "updated_at"],
        searchColumns: ["title", "category"],
        orderBy: "display_order ASC, updated_at DESC, id DESC",
    },
    skills: {
        table: "skills",
        columns: ["name", "category", "display_order", "status"],
        listColumns: ["id", "name", "category", "status", "display_order", "updated_at"],
        searchColumns: ["name"],
        orderBy: "display_order ASC, category ASC, name ASC",
    },
    experience: {
        table: "experiences",
        columns: [
            "title", "organization", "period_label", "started_on", "ended_on",
            "is_current", "description", "experience_type", "status", "display_order",
        ],
        listColumns: ["id", "title", "organization", "period_label", "experience_type", "status", "is_current", "display_order", "updated_at"],
        searchColumns: ["title", "organization"],
        orderBy: "display_order ASC, id ASC",
    },
    messages: {
        table: "contact_messages",
        columns: ["sender_name", "sender_email", "subject", "message", "is_read", "created_at"],
        listColumns: ["id", "sender_name", "sender_email", "subject", "is_read", "created_at"],
        searchColumns: ["sender_name", "sender_email", "subject"],
        orderBy: "created_at DESC, id DESC",
    },
};

const PROFILE_COLUMNS = [
    "full_name", "headline", "introduction", "biography", "location", "public_email",
    "phone", "linkedin_url", "github_url", "resume_path", "profile_image_path",
    "seo_title", "seo_description",
] as const;

const PUBLIC_COLUMNS: Readonly<Record<Exclude<ContentResource, "messages">, readonly string[]>> = {
    projects: [
        "id", "title", "slug", "category", "summary", "overview", "purpose", "role",
        "contribution", "solution", "description", "technologies", "features", "lessons",
        "live_url", "repository_url", "cover_image_path", "is_featured", "display_order",
    ],
    certificates: [
        "id", "title", "issuing_organization", "issued_on", "credential_url",
        "credential_id", "file_path", "display_image_path", "description", "display_order",
    ],
    designs: [
        "id", "title", "category", "description", "image_path", "external_url",
        "is_featured", "display_order",
    ],
    skills: ["id", "name", "category", "display_order"],
    experience: [
        "id", "title", "organization", "period_label", "started_on", "ended_on",
        "is_current", "description", "experience_type", "display_order",
    ],
};

const SKILL_CATEGORIES = new Set([
    "Programming Languages", "Programming", "Frameworks and Libraries", "Frameworks",
    "Databases", "Tools and Platforms", "Tools", "IT Support", "Systems Analysis",
    "Design", "Other Skills",
]);
const EXPERIENCE_TYPES = new Set([
    "work", "placement", "freelance", "leadership", "volunteering", "volunteer", "education",
]);
const STATUSES = new Set(["draft", "published"]);
const MEDIA_FIELDS = new Set([
    "cover_image_path", "file_path", "display_image_path", "image_path",
    "profile_image_path", "resume_path",
]);
const MAX_PAGE = 100_000;

export function isContentResource(value: string | null): value is ContentResource {
    return value !== null && (CONTENT_RESOURCES as readonly string[]).includes(value);
}

export function readRecordId(value: string | null): number | null {
    if (value === null || !/^[1-9]\d{0,9}$/.test(value)) {
        return null;
    }

    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
}

export function resourceTable(resource: ContentResource): string {
    return RESOURCES[resource].table;
}

export function resourceColumns(resource: ContentResource): readonly string[] {
    return RESOURCES[resource].columns;
}

export function mediaFieldsFor(resource: ContentResource): readonly string[] {
    return resourceColumns(resource).filter((column) => MEDIA_FIELDS.has(column));
}

export async function allowedSkillCategories(client: TransactionClient): Promise<Set<string>> {
    const result = await client.query<{ category: string }>(
        "SELECT DISTINCT category FROM skills WHERE category <> ''",
    );
    return new Set([...SKILL_CATEGORIES, ...result.rows.map((row: { category: string }) => row.category)]);
}

export async function allowedExperienceTypes(
    client: TransactionClient,
    current: string | null = null,
): Promise<Set<string>> {
    const result = await client.query<{ experience_type: string }>(
        "SELECT DISTINCT experience_type FROM experiences WHERE experience_type <> ''",
    );
    const values = [...EXPERIENCE_TYPES, ...result.rows.map((row: { experience_type: string }) => row.experience_type)];
    if (current !== null && current !== "") {
        values.push(current);
    }
    return new Set(values);
}

export async function listAdminRecords(
    client: TransactionClient,
    resource: ContentResource,
    page: number,
    requestedPageSize: number,
    search: string,
    status: string,
    category: string,
    read: string,
): Promise<{ items: Record<string, unknown>[]; page: number; pageSize: number; total: number }> {
    const definition = RESOURCES[resource];
    const pageSize = Math.max(1, Math.min(50, requestedPageSize));
    const safePage = Math.max(1, Math.min(MAX_PAGE, page));
    const values: unknown[] = [];
    const conditions: string[] = [];
    const trimmedSearch = search.trim().slice(0, 120);

    if (trimmedSearch !== "") {
        values.push(`%${escapeLike(trimmedSearch)}%`);
        const parameter = `$${values.length}`;
        conditions.push(`(${definition.searchColumns.map((column) => `${column} ILIKE ${parameter} ESCAPE '\\'`).join(" OR ")})`);
    }
    if (resource !== "messages" && (status === "draft" || status === "published")) {
        values.push(status);
        conditions.push(`status = $${values.length}`);
    } else if (resource === "messages" && (read === "read" || read === "unread")) {
        values.push(read === "read");
        conditions.push(`is_read = $${values.length}`);
    }
    if ((resource === "skills" || resource === "designs") && category !== "") {
        values.push(category.slice(0, 80));
        conditions.push(`category = $${values.length}`);
    }
    if (resource === "experience" && category !== "" && EXPERIENCE_TYPES.has(category)) {
        values.push(category);
        conditions.push(`experience_type = $${values.length}`);
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await client.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM ${definition.table}${where}`,
        values,
    );
    const total = Number(countResult.rows[0]?.total ?? 0);
    const offset = (safePage - 1) * pageSize;
    const pageValues = [...values, pageSize, offset];
    const result = await client.query<Record<string, unknown>>(
        `SELECT ${definition.listColumns.join(", ")} FROM ${definition.table}${where} ORDER BY ${definition.orderBy} LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
        pageValues,
    );

    return { items: result.rows, page: safePage, pageSize, total };
}

export async function getAdminRecord(
    client: TransactionClient,
    resource: ContentResource,
    id: number,
): Promise<Record<string, unknown> | null> {
    const result = await client.query<Record<string, unknown>>(
        `SELECT id, ${RESOURCES[resource].columns.join(", ")} FROM ${RESOURCES[resource].table} WHERE id = $1 LIMIT 1`,
        [id],
    );

    return result.rows[0] ?? null;
}

export async function getProfile(client: TransactionClient): Promise<Record<string, unknown> | null> {
    const result = await client.query<Record<string, unknown>>(
        `SELECT id, ${PROFILE_COLUMNS.join(", ")}, updated_at FROM profile_settings WHERE id = 1 LIMIT 1`,
    );

    return result.rows[0] ?? null;
}

export async function writeRecord(
    client: TransactionClient,
    resource: ContentResource,
    id: number | null,
    record: ContentRecord,
): Promise<number> {
    const definition = RESOURCES[resource];
    const columns = definition.columns.filter((column) => record[column] !== undefined);
    if (columns.length !== definition.columns.length) {
        throw new HttpError(400, "invalid_record", "Complete all required fields before saving.");
    }
    const values = columns.map((column) => record[column]);

    if (id === null) {
        const placeholders = columns.map((_, index) => `$${index + 1}`);
        const result = await client.query<{ id: number }>(
            `INSERT INTO ${definition.table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING id`,
            values,
        );
        const newId = result.rows[0]?.id;
        if (typeof newId !== "number") {
            throw new Error("The new content record did not return an ID.");
        }
        return newId;
    }

    const setters = columns.map((column, index) => `${column} = $${index + 1}`);
    const result = await client.query<{ id: number }>(
        `UPDATE ${definition.table} SET ${setters.join(", ")} WHERE id = $${columns.length + 1} RETURNING id`,
        [...values, id],
    );
    if (result.rows[0] === undefined) {
        throw new HttpError(404, "record_not_found", "That record could not be found.");
    }

    return id;
}

export async function saveProfile(
    client: TransactionClient,
    record: ContentRecord,
): Promise<void> {
    const columns = PROFILE_COLUMNS.filter((column) => record[column] !== undefined);
    if (columns.length !== PROFILE_COLUMNS.length) {
        throw new HttpError(400, "invalid_record", "Complete all required profile fields before saving.");
    }
    const values = columns.map((column) => record[column]);
    const placeholders = ["1", ...columns.map((_, index) => `$${index + 1}`)];
    const updates = columns.map((column) => `${column} = EXCLUDED.${column}`);
    await client.query(
        `INSERT INTO profile_settings (id, ${columns.join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT (id) DO UPDATE SET ${updates.join(", ")}`,
        values,
    );
}

export async function deleteAdminRecord(
    client: TransactionClient,
    resource: ContentResource,
    id: number,
): Promise<Record<string, unknown>> {
    const previous = await getAdminRecord(client, resource, id);
    if (previous === null) {
        throw new HttpError(404, "record_not_found", "That record could not be found.");
    }
    const result = await client.query(
        `DELETE FROM ${RESOURCES[resource].table} WHERE id = $1`,
        [id],
    );
    if (result.rowCount !== 1) {
        throw new HttpError(404, "record_not_found", "That record could not be found.");
    }

    return previous;
}

export async function getPublicProfile(client: TransactionClient): Promise<Record<string, unknown> | null> {
    const result = await client.query<Record<string, unknown>>(
        `SELECT full_name, headline, introduction, biography, location, public_email, phone, linkedin_url, github_url, resume_path, profile_image_path, seo_title, seo_description FROM profile_settings WHERE id = 1 LIMIT 1`,
    );

    return result.rows[0] ?? null;
}

export async function listPublicRecords(
    client: TransactionClient,
    resource: Exclude<ContentResource, "messages">,
): Promise<Record<string, unknown>[]> {
    const definition = RESOURCES[resource];
    const columns = PUBLIC_COLUMNS[resource];
    const orderBy = resource === "projects" || resource === "designs"
        ? "is_featured DESC, display_order ASC, id ASC"
        : resource === "certificates"
            ? "display_order ASC, issued_on DESC, id ASC"
            : definition.orderBy;
    const result = await client.query<Record<string, unknown>>(
        `SELECT ${columns.join(", ")} FROM ${definition.table} WHERE status = 'published' ORDER BY ${orderBy} LIMIT 500`,
    );

    return result.rows;
}

export async function getPublicProject(
    client: TransactionClient,
    slug: string,
): Promise<Record<string, unknown> | null> {
    const result = await client.query<Record<string, unknown>>(
        `SELECT ${PUBLIC_COLUMNS.projects.join(", ")} FROM projects WHERE slug = $1 AND status = 'published' LIMIT 1`,
        [slug],
    );

    return result.rows[0] ?? null;
}

export function validateRecord(
    resource: ContentResource,
    raw: unknown,
    allowedSkillCategories: ReadonlySet<string> = SKILL_CATEGORIES,
    allowedExperienceTypes: ReadonlySet<string> = EXPERIENCE_TYPES,
): ContentRecord {
    if (!isPlainObject(raw)) {
        throw new HttpError(400, "invalid_record", "The record must be a JSON object.");
    }
    if (resource === "messages") {
        const isRead = raw.is_read;
        if (typeof isRead !== "boolean") {
            throw new HttpError(400, "invalid_record", "Choose a valid message status.");
        }
        return { is_read: isRead };
    }

    const values: ContentRecord = {};
    const status = readString(raw, "status", 16, false);
    if (!STATUSES.has(status)) {
        throw new HttpError(400, "invalid_record", "Choose draft or published.");
    }
    const order = readInteger(raw, "display_order", -1000, 10000, 0);
    values.status = status;
    values.display_order = order;

    if (resource === "projects") {
        values.title = readString(raw, "title", 160, true);
        values.slug = readString(raw, "slug", 180, true).toLowerCase();
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(values.slug))) {
            throw new HttpError(400, "invalid_record", "Use a lowercase slug with letters, numbers, and hyphens.");
        }
        values.category = readString(raw, "category", 80, true);
        values.summary = readString(raw, "summary", 500, true);
        for (const [field, max] of [
            ["overview", 8000], ["purpose", 8000], ["role", 180], ["contribution", 8000],
            ["solution", 8000], ["technologies", 500], ["features", 8000], ["lessons", 8000],
        ] as const) {
            values[field] = nullableString(raw, field, max);
        }
        values.description = values.purpose;
        values.live_url = optionalUrl(raw, "live_url");
        values.repository_url = optionalUrl(raw, "repository_url");
        values.cover_image_path = mediaReference(raw, "cover_image_path", ["projects"]);
        values.is_featured = readBoolean(raw, "is_featured");
    } else if (resource === "certificates") {
        values.title = readString(raw, "title", 180, true);
        values.issuing_organization = readString(raw, "issuing_organization", 180, true);
        values.issued_on = optionalDate(raw, "issued_on");
        values.credential_url = optionalUrl(raw, "credential_url");
        values.credential_id = nullableString(raw, "credential_id", 120);
        values.file_path = mediaReference(raw, "file_path", ["certificates"]);
        values.display_image_path = mediaReference(raw, "display_image_path", ["certificates"]);
        values.description = nullableString(raw, "description", 8000);
    } else if (resource === "designs") {
        values.title = readString(raw, "title", 160, true);
        values.category = readString(raw, "category", 80, true);
        values.description = nullableString(raw, "description", 8000);
        values.image_path = mediaReference(raw, "image_path", ["designs"]);
        values.external_url = optionalUrl(raw, "external_url");
        values.is_featured = readBoolean(raw, "is_featured");
        if (status === "published" && values.image_path === null) {
            throw new HttpError(400, "invalid_record", "Add an image before publishing this design item.");
        }
    } else if (resource === "skills") {
        values.name = readString(raw, "name", 120, true);
        values.category = readString(raw, "category", 80, true);
        if (!allowedSkillCategories.has(String(values.category))) {
            throw new HttpError(400, "invalid_record", "Choose a recognized skill category.");
        }
    } else {
        values.title = readString(raw, "title", 160, true);
        values.organization = readString(raw, "organization", 180, true);
        values.experience_type = readString(raw, "experience_type", 40, true);
        if (!allowedExperienceTypes.has(String(values.experience_type))) {
            throw new HttpError(400, "invalid_record", "Choose a recognized experience type.");
        }
        values.started_on = optionalDate(raw, "started_on");
        values.ended_on = optionalDate(raw, "ended_on");
        values.is_current = readBoolean(raw, "is_current");
        if (values.is_current && values.ended_on !== null) {
            throw new HttpError(400, "invalid_record", "Clear the end date for a current role.");
        }
        if (
            typeof values.started_on === "string"
            && typeof values.ended_on === "string"
            && values.started_on > values.ended_on
        ) {
            throw new HttpError(400, "invalid_record", "The end date must be on or after the start date.");
        }
        values.period_label = readString(raw, "period_label", 80, false);
        if (values.period_label === "") {
            values.period_label = derivePeriodLabel(
                values.started_on,
                values.ended_on,
                values.is_current,
            );
        }
        if (values.period_label === "") {
            throw new HttpError(400, "invalid_record", "Add a period or provide a start date.");
        }
        values.description = nullableString(raw, "description", 8000);
    }

    return values;
}

export function validateProfile(raw: unknown, current: Record<string, unknown> | null): ContentRecord {
    if (!isPlainObject(raw)) {
        throw new HttpError(400, "invalid_record", "The profile must be a JSON object.");
    }

    const record: ContentRecord = {};
    const required = new Set(["full_name", "headline", "introduction"]);
    for (const [field, max] of [
        ["full_name", 120], ["headline", 180], ["introduction", 5000], ["biography", 20000],
        ["location", 160], ["seo_title", 160], ["seo_description", 320],
    ] as const) {
        const value = readString(raw, field, max, required.has(field));
        record[field] = value === "" ? null : value;
    }
    record.public_email = optionalEmail(raw, "public_email");
    record.phone = optionalPhone(raw);
    record.linkedin_url = optionalUrl(raw, "linkedin_url");
    record.github_url = optionalUrl(raw, "github_url");
    record.resume_path = Object.hasOwn(raw, "resume_path")
        ? mediaReference(raw, "resume_path", ["resume"])
        : safeExistingPath(current?.resume_path);
    record.profile_image_path = Object.hasOwn(raw, "profile_image_path")
        ? mediaReference(raw, "profile_image_path", ["profile"])
        : safeExistingPath(current?.profile_image_path);

    return record;
}

export function parseMediaKey(value: unknown): string | null {
    if (typeof value !== "string" || !value.startsWith("netlify-blobs:")) {
        return null;
    }
    const key = value.slice("netlify-blobs:".length);
    return /^[a-z]+\/[0-9a-f-]{36}\.(?:jpg|jpeg|png|gif|webp|pdf)$/.test(key) ? key : null;
}

export async function isMediaReferenceInUse(
    client: TransactionClient,
    key: string,
): Promise<boolean> {
    const value = `netlify-blobs:${key}`;
    const result = await client.query<{ exists: boolean }>(
        `SELECT
            EXISTS (SELECT 1 FROM profile_settings WHERE profile_image_path = $1 OR resume_path = $1)
            OR EXISTS (SELECT 1 FROM projects WHERE cover_image_path = $1)
            OR EXISTS (SELECT 1 FROM certificates WHERE file_path = $1 OR display_image_path = $1)
            OR EXISTS (SELECT 1 FROM design_items WHERE image_path = $1) AS exists`,
        [value],
    );

    return result.rows[0]?.exists === true;
}

export async function recordForPublicMedia(
    client: TransactionClient,
    key: string,
): Promise<boolean> {
    const value = `netlify-blobs:${key}`;
    const result = await client.query<{ available: boolean }>(
        `SELECT
            EXISTS (SELECT 1 FROM profile_settings WHERE profile_image_path = $1 AND $1 LIKE 'netlify-blobs:profile/%')
            OR EXISTS (SELECT 1 FROM profile_settings WHERE resume_path = $1 AND $1 LIKE 'netlify-blobs:resume/%.pdf')
            OR EXISTS (SELECT 1 FROM projects WHERE cover_image_path = $1 AND status = 'published')
            OR EXISTS (SELECT 1 FROM certificates WHERE (file_path = $1 OR display_image_path = $1) AND status = 'published')
            OR EXISTS (SELECT 1 FROM design_items WHERE image_path = $1 AND status = 'published') AS available`,
        [value],
    );
    return result.rows[0]?.available === true;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
    raw: Record<string, unknown>,
    field: string,
    max: number,
    required: boolean,
): string {
    const value = raw[field];
    if (value === undefined || value === null) {
        if (required) {
            throw new HttpError(400, "invalid_record", `${field} is required.`);
        }
        return "";
    }
    if (typeof value !== "string") {
        throw new HttpError(400, "invalid_record", `${field} must be text.`);
    }
    const cleaned = value.replace(/\0/g, "").trim();
    if (required && cleaned === "") {
        throw new HttpError(400, "invalid_record", `${field} is required.`);
    }
    if (cleaned.length > max) {
        throw new HttpError(400, "invalid_record", `${field} must be ${max} characters or fewer.`);
    }
    return cleaned;
}

function nullableString(raw: Record<string, unknown>, field: string, max: number): string | null {
    const value = readString(raw, field, max, false);
    return value === "" ? null : value;
}

function readInteger(
    raw: Record<string, unknown>,
    field: string,
    minimum: number,
    maximum: number,
    fallback: number,
): number {
    const value = raw[field];
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    const number = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(number) || number < minimum || number > maximum) {
        throw new HttpError(400, "invalid_record", `${field} must be a whole number between ${minimum} and ${maximum}.`);
    }
    return number;
}

function readBoolean(raw: Record<string, unknown>, field: string): boolean {
    const value = raw[field];
    if (value === true || value === 1 || value === "1") {
        return true;
    }
    if (value === false || value === 0 || value === "0" || value === undefined || value === null) {
        return false;
    }
    throw new HttpError(400, "invalid_record", `${field} must be true or false.`);
}

function optionalDate(raw: Record<string, unknown>, field: string): string | null {
    const value = readString(raw, field, 10, false);
    if (value === "") {
        return null;
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
        throw new HttpError(400, "invalid_record", `${field} must be a real date.`);
    }
    return value;
}

function optionalUrl(raw: Record<string, unknown>, field: string): string | null {
    const value = readString(raw, field, 255, false);
    if (value === "") {
        return null;
    }
    try {
        const parsed = new URL(value);
        if (!["http:", "https:"].includes(parsed.protocol) || parsed.username !== "" || parsed.password !== "") {
            throw new Error();
        }
        return parsed.toString();
    } catch {
        throw new HttpError(400, "invalid_record", `${field} must be a complete HTTP or HTTPS URL.`);
    }
}

function optionalEmail(raw: Record<string, unknown>, field: string): string | null {
    const value = readString(raw, field, 190, false).toLowerCase();
    if (value === "") {
        return null;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new HttpError(400, "invalid_record", `${field} must be a valid email address.`);
    }
    return value;
}

function optionalPhone(raw: Record<string, unknown>): string | null {
    const value = readString(raw, "phone", 40, false);
    if (value === "") {
        return null;
    }
    if (!/^[+()\d.\-\s]+$/.test(value) || !/\d/.test(value)) {
        throw new HttpError(400, "invalid_record", "phone must contain digits and normal separators.");
    }
    return value;
}

function mediaReference(raw: Record<string, unknown>, field: string, prefixes: readonly string[]): string | null {
    const value = readString(raw, field, 255, false);
    if (value === "") {
        return null;
    }
    const key = parseMediaKey(value);
    if (key !== null) {
        if (!prefixes.some((prefix) => key.startsWith(`${prefix}/`))) {
            throw new HttpError(400, "invalid_record", `${field} uses an invalid media category.`);
        }
        return value;
    }
    if (/^https:\/\//i.test(value)) {
        return optionalUrl({ [field]: value }, field);
    }
    if (/^uploads\/[a-z]+\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(value) && !value.includes("..")) {
        return value;
    }
    throw new HttpError(400, "invalid_record", `${field} is not a valid saved media reference.`);
}

function safeExistingPath(value: unknown): string | null {
    return typeof value === "string" && value.length <= 255 && !value.includes("..") ? value : null;
}

function derivePeriodLabel(start: unknown, end: unknown, isCurrent: unknown): string {
    const format = (value: unknown): string => {
        if (typeof value !== "string") {
            return "";
        }
        return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" })
            .format(new Date(`${value}T00:00:00.000Z`));
    };
    const startLabel = format(start);
    const endLabel = format(end);
    if (startLabel !== "" && isCurrent === true) {
        return `${startLabel} – Present`;
    }
    if (startLabel !== "" && endLabel !== "") {
        return `${startLabel} – ${endLabel}`;
    }
    if (startLabel !== "") {
        return startLabel;
    }
    return isCurrent === true ? "Present" : "";
}

function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, "\\$&");
}
