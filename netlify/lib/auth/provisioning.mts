/**
 * One-time, secret-authorized provisioning of the first administrator.
 *
 * There is no public registration and no seeded account, so exactly one
 * operation ever creates an administrator: a call to `POST /api/admin/setup`
 * that presents the `ADMIN_SETUP_TOKEN` configured in the server environment.
 *
 * Two independent guards protect it, and only the second is permanent:
 *
 *   1. **The secret.** Compared in constant time against the environment value.
 *      When `ADMIN_SETUP_TOKEN` is unset the endpoint is unavailable and no
 *      code path reaches the database. The operator is expected to delete the
 *      variable (and redeploy) once provisioning is done.
 *   2. **A singleton setup guard.** A conditional row update and the admin
 *      insert share a transaction. Two simultaneous setup requests therefore
 *      serialize: only the first can claim the guard; the other is refused
 *      with `410 Gone`. The guard remains claimed after the first commit even
 *      if the administrator is later removed.
 *
 * The claim rolls back automatically if provisioning fails before commit.
 */

import { timingSafeEqual } from "node:crypto";

import { withTransaction } from "../database.mts";

import { countAdmins, insertAdmin, type AdminIdentity } from "./admins.mts";
import { hashPassword } from "./password.mts";

/** Result of an attempt to provision the first administrator. */
export type ProvisionOutcome =
    | { readonly status: "created"; readonly admin: AdminIdentity }
    | { readonly status: "closed" };

/** Input required to create the first administrator. */
export interface ProvisionInput {
    readonly name: string;
    readonly email: string;
    readonly password: string;
}

/**
 * Compares the submitted setup secret with the configured one.
 *
 * `timingSafeEqual` requires equal-length buffers, so the length is checked
 * first — mirroring the design in Phase 3A §8. Returning early on a length
 * mismatch does reveal the configured secret's length, which is public
 * knowledge anyway (the operator generates it, and a 32-byte minimum is
 * documented). It does **not** reveal any part of the value.
 */
export function verifySetupToken(configured: string | null, presented: unknown): boolean {
    if (configured === null || typeof presented !== "string") {
        return false;
    }

    const expected = Buffer.from(configured, "utf8");
    const actual = Buffer.from(presented, "utf8");

    if (expected.length !== actual.length) {
        return false;
    }

    return timingSafeEqual(expected, actual);
}

/**
 * Creates the first administrator, or reports that provisioning is closed.
 *
 * Steps inside the single transaction, in this order:
 *
 *   1. atomically claim the singleton setup guard;
 *   3. count the administrators and refuse when the count is non-zero;
 *   4. hash the password with Argon2id;
 *   5. insert the administrator;
 *   6. return, and let `withTransaction` commit.
 *
 * Hashing happens after the guard claim within the same transaction so the
 * claim and administrator insert commit or roll back together.
 */
export async function provisionFirstAdmin(input: ProvisionInput): Promise<ProvisionOutcome> {
    return withTransaction(async (client) => {
        const claim = await client.query(
            `UPDATE admin_setup_guard
                SET completed_at = now()
              WHERE id = 1
                AND completed_at IS NULL
          RETURNING id`,
        );

        if (claim.rowCount !== 1) {
            return { status: "closed" };
        }

        if ((await countAdmins(client)) > 0) {
            return { status: "closed" };
        }

        const passwordHash = await hashPassword(input.password);

        const admin = await insertAdmin(client, input.name, input.email, passwordHash);

        return { status: "created", admin };
    });
}
