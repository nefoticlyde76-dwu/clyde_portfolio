/**
 * Administrator record access.
 *
 * Deliberately mirrors the PHP model it replaces
 * (`app/Models/Admin.php`), so the identity lookup rule does not drift during
 * the migration:
 *
 *   - a single `email` column is the only login identifier;
 *   - the lookup is an exact, case-sensitive equality on the value the caller
 *     already normalised;
 *   - the selected columns are exactly the four the PHP model selects.
 *
 * Every statement is parameterised. No function in this module logs, returns
 * or throws password material.
 */

import type { TransactionClient } from "../database.mts";

/** Identity safe to return to a client or place in a response body. */
export type AdminIdentity = {
    readonly id: number;
    readonly name: string;
    readonly email: string;
};

/** Identity plus the stored PHC password hash. Never serialised to a client. */
export type AdminCredential = AdminIdentity & {
    readonly passwordHash: string;
};

type AdminRow = {
    id: number;
    name: string;
    email: string;
    password_hash: string;
};

/** Narrows a database row to the public identity shape. */
export function toAdminIdentity(row: AdminIdentity): AdminIdentity {
    return { id: row.id, name: row.name, email: row.email };
}

/**
 * Finds an administrator by email.
 *
 * Equivalent to `SELECT id, name, email, password_hash FROM admins WHERE
 * email = ? LIMIT 1`. Uses `client` supplied by the caller so the lookup can
 * share a transaction with the surrounding rate-limit work.
 */
export async function findAdminByEmail(
    client: TransactionClient,
    email: string,
): Promise<AdminCredential | null> {
    const result = await client.query<AdminRow>(
        `SELECT id, name, email, password_hash
           FROM admins
          WHERE email = $1
          LIMIT 1`,
        [email],
    );

    const row = result.rows[0];

    if (row === undefined) {
        return null;
    }

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        passwordHash: row.password_hash,
    };
}

/** Counts administrator accounts. Used as the provisioning guard. */
export async function countAdmins(client: TransactionClient): Promise<number> {
    const result = await client.query<{ total: string }>(
        "SELECT count(*)::text AS total FROM admins",
    );

    return Number.parseInt(result.rows[0]?.total ?? "0", 10);
}

/**
 * Inserts an administrator and returns its public identity.
 *
 * The caller is responsible for hashing the password and claiming the
 * transactional `admin_setup_guard` row before inserting the first account.
 */
export async function insertAdmin(
    client: TransactionClient,
    name: string,
    email: string,
    passwordHash: string,
): Promise<AdminIdentity> {
    const result = await client.query<{ id: number; name: string; email: string }>(
        `INSERT INTO admins (name, email, password_hash)
              VALUES ($1, $2, $3)
           RETURNING id, name, email`,
        [name, email, passwordHash],
    );

    const row = result.rows[0];

    if (row === undefined) {
        throw new Error("Administrator insert returned no row.");
    }

    return { id: row.id, name: row.name, email: row.email };
}
