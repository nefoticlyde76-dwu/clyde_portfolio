/**
 * Central database access module for the Netlify migration.
 *
 * Responsibilities
 * ----------------
 * - Provide a single, memoised entry point to the Netlify Database client
 *   (`getDatabase()` from `@netlify/database`).
 * - Expose the native parameterised SQL API (`db.sql`), which automatically
 *   binds interpolated values as query parameters — never string concatenation.
 * - Provide a transaction helper built on the underlying connection pool, so
 *   that `BEGIN` / `COMMIT` / `ROLLBACK` always execute on the same connection.
 * - Declare explicit TypeScript row types for the migrated database records.
 *
 * This module contains database access only. It must not contain HTTP
 * request/response handling — that belongs in the Netlify Functions.
 */

import { getDatabase } from "@netlify/database";

/** The Netlify Database client, as returned by `getDatabase()`. */
export type NetlifyDatabase = ReturnType<typeof getDatabase>;

/**
 * Acquires a pooled connection for a transaction.
 *
 * Declared as a helper so the connection type can be derived from the pool
 * without importing `pg` directly. The zero-argument `connect()` overload
 * resolves to `Promise<PoolClient>`.
 */
async function connectTransactionClient() {
    return getDb().pool.connect();
}

/** A pooled database connection, used to run a transaction. */
export type TransactionClient = Awaited<ReturnType<typeof connectTransactionClient>>;

let cachedClient: NetlifyDatabase | undefined;

/**
 * Returns the shared database client for the current runtime.
 *
 * The client is created lazily on first use and reused for the lifetime of the
 * process, so connection metadata is resolved from the current environment
 * (production, deploy preview branch, or the local development database).
 */
export function getDb(): NetlifyDatabase {
    if (cachedClient === undefined) {
        cachedClient = getDatabase();
    }

    return cachedClient;
}

/**
 * Runs `work` inside a single database transaction.
 *
 * All statements executed through the supplied client belong to the same
 * connection, so `BEGIN` / `COMMIT` / `ROLLBACK` behave atomically. If `work`
 * throws, the transaction is rolled back and the error is re-thrown. The
 * connection is always released back to the pool.
 */
export async function withTransaction<T>(
    work: (client: TransactionClient) => Promise<T>,
): Promise<T> {
    const client = await connectTransactionClient();

    try {
        await client.query("BEGIN");

        const result = await work(client);

        await client.query("COMMIT");

        return result;
    } catch (error) {
        await client.query("ROLLBACK");

        throw error;
    } finally {
        client.release();
    }
}

/* ------------------------------------------------------------------------- *
 * Row types
 *
 * Column names are snake_case, matching the PostgreSQL schema created by
 * `netlify/database/migrations`. Timestamp columns are `TIMESTAMPTZ`.
 * ------------------------------------------------------------------------- */

/** Publication state shared by the content tables. */
export type ContentStatus = "draft" | "published";

export interface AdminRow {
    id: number;
    name: string;
    email: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
}

export interface AdminSessionRow {
    id: string;
    admin_id: number;
    token_hash: string;
    created_at: Date;
    expires_at: Date;
    last_used: Date;
}

export interface LoginAttemptRow {
    id: number;
    identifier: string;
    attempted_at: Date;
}

export interface ProfileSettingsRow {
    id: number;
    full_name: string;
    headline: string;
    introduction: string;
    biography: string | null;
    location: string | null;
    public_email: string | null;
    phone: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    resume_path: string | null;
    profile_image_path: string | null;
    seo_title: string | null;
    seo_description: string | null;
    updated_at: Date;
}

export interface ProjectRow {
    id: number;
    title: string;
    slug: string;
    category: string;
    summary: string;
    overview: string | null;
    purpose: string | null;
    role: string | null;
    contribution: string | null;
    solution: string | null;
    description: string | null;
    technologies: string | null;
    features: string | null;
    lessons: string | null;
    live_url: string | null;
    repository_url: string | null;
    cover_image_path: string | null;
    is_featured: boolean;
    status: ContentStatus;
    display_order: number;
    created_at: Date;
    updated_at: Date;
}

export interface CertificateRow {
    id: number;
    title: string;
    issuing_organization: string;
    issued_on: Date | null;
    credential_url: string | null;
    credential_id: string | null;
    file_path: string | null;
    display_image_path: string | null;
    description: string | null;
    status: ContentStatus;
    display_order: number;
    created_at: Date;
    updated_at: Date;
}

export interface DesignItemRow {
    id: number;
    title: string;
    category: string;
    description: string | null;
    image_path: string | null;
    external_url: string | null;
    is_featured: boolean;
    status: ContentStatus;
    display_order: number;
    created_at: Date;
    updated_at: Date;
}

export interface SkillRow {
    id: number;
    name: string;
    category: string;
    display_order: number;
    status: ContentStatus;
    created_at: Date;
    updated_at: Date;
}

export interface ExperienceRow {
    id: number;
    title: string;
    organization: string;
    period_label: string;
    started_on: Date | null;
    ended_on: Date | null;
    is_current: boolean;
    description: string | null;
    experience_type: string;
    status: ContentStatus;
    display_order: number;
    created_at: Date;
    updated_at: Date;
}

export interface ContactMessageRow {
    id: number;
    sender_name: string;
    sender_email: string;
    subject: string;
    message: string;
    is_read: boolean;
    created_at: Date;
}
