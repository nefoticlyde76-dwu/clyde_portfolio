# Phase 3B.1 — Authentication Compatibility and Database Integrity Report

**Repository:** `clyde-portfolio`

**Branch:** `migration/netlify`

**HEAD:** `597f80c408ad1138f952354e4f8169952a808078`

**Scope:** local database migration, authentication compatibility, and deployment validation. No commit, push, or deployment was performed.

## Executive result

Migration `0003_auth_atomicity` was applied to the existing local database without resetting it. The original 34 portfolio records still match their pre-migration, per-record canonical SHA-256 hashes. The setup guard is present and unclaimed; the project database contains no administrator, session, login attempt, or rate-limit bucket.

Windows validation passed, including the 18 authentication tests and direct HTTP tests through `netlify functions:serve`. Linux Argon2 execution and managed PostgreSQL concurrency remain unverified. The function ZIPs built on this Windows x64 host contain the Windows Argon2 native binary, so those local artifacts are not evidence of a deployable Linux package.

## Git and safety state

- Current branch is `migration/netlify`, at the requested baseline commit.
- `main` remains at the baseline; no switch, commit, push, or deploy was performed.
- The pre-existing root `.htaccess` deletion remains unstaged and untouched.
- No files were staged. Existing migration work remains uncommitted.
- The generated `dist/` and `.netlify/functions-build/` artifacts are ignored.
- `git diff --check` is included in final verification after this report is written.
- The only validation-phase source edit was correcting the rate-limit module’s stale comment to distinguish bucket state from attempt records in [rate-limit.mts](../netlify/lib/auth/rate-limit.mts).

## Existing local database before migration

Migration status before applying 0003 was:

| Migration | Before |
|---|---|
| `0001_portfolio_schema` | Applied |
| `0002_auth_support` | Applied |
| `0003_auth_atomicity` | Pending |

The eight portfolio tables contained 34 rows total. `admins`, `admin_sessions`, and `login_attempts` were empty. No rate-limit buckets or setup-guard table existed yet.

## Migration 0003 and post-migration state

Only the pending migration was applied using Netlify’s supported local migration command, targeting `0003_auth_atomicity`. The resulting `netlify database status --json` reports migrations 0001, 0002, and 0003 applied, with no pending, missing-on-disk, or out-of-order migrations.

Migration-created objects verified in the database:

- `login_rate_limit_buckets`
  - `identifier VARCHAR(67)` primary key.
  - `failure_times TIMESTAMPTZ[] NOT NULL`, defaulting to an empty array.
  - `in_flight INTEGER NOT NULL`, defaulting to zero and constrained to `>= 0`.
  - `updated_at TIMESTAMPTZ NOT NULL`, defaulting to `now()`.
  - Partial expiry index on `updated_at` where `in_flight = 0`.
- `admin_setup_guard`
  - `id SMALLINT` primary key with `CHECK (id = 1)`.
  - Nullable `completed_at TIMESTAMPTZ`.
  - Exactly one seeded row, `(id = 1, completed_at = NULL)`.

The persistent local database now reports 0 administrators, 0 sessions, 0 login-attempt rows, 0 rate-limit buckets, and one unclaimed setup-guard row. No session or test login-attempt record remains in this database.

### Backfill behavior

There were no existing `login_attempts` rows in the project database, so migration 0003 correctly created no backfilled buckets there. To validate the non-empty path without touching the project database, a separate disposable database was migrated through 0001/0002, seeded with synthetic namespaced hashed attempts, and then migrated through 0003. The test confirmed:

- Recent `ip:<sha256>` and `id:<sha256>` attempts were backfilled into their corresponding buckets.
- Only failures in the 15-minute window were put in `failure_times`.
- Identifiers with no matching namespace/hash format and identifiers whose attempts were older than the 24-hour retention window were excluded.
- Backfilled reservations had `in_flight = 0`.

The temporary database directory was removed after the test.

## Portfolio data integrity

The pre-migration snapshot was captured and retained outside the repository during verification, then removed after its row hashes were recorded here. Canonicalization uses `N` for null, `B1`/`B0` for booleans, and `S<length>:<text>` for other values; each row payload is the table name, a NUL separator, and ordered column values separated by SOH, then SHA-256 hashed. Dates use `YYYY-MM-DD`; timestamps use `YYYY-MM-DD HH24:MI:SS` in `Pacific/Port_Moresby`. Each current record was compared by table and primary key against its saved row hash. Result: **34 of 34 row hashes matched; zero mismatches**.

| Table | Rows before | Rows after | Pre-migration snapshot aggregate SHA-256 |
|---|---:|---:|---|
| `admins` | 0 | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `profile_settings` | 1 | 1 | `3eabebcc303e927bce1ff35e0caaa5ca4c2138c396cb203f68b4d98dbd3fc38d` |
| `projects` | 1 | 1 | `ba5b77a8604ca97d654d3142928e9115a7184ee47e6c0e85ec1de743895ae844` |
| `certificates` | 0 | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `design_items` | 2 | 2 | `d91279482ab4824c38a95ecc54524b310fe0e7fc8f72519a08653e5005e10a9a` |
| `skills` | 27 | 27 | `125565f8bac08ee47f31f90fd39e13f04280d9678b65f8a9d6a226cf1fd08d53` |
| `experiences` | 3 | 3 | `053564d08c84a828076315bf76901494c08d583c9553b72ff30233964741d261` |
| `contact_messages` | 0 | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| **Total** | **34** | **34** | |

### Per-record canonical SHA-256 values

These are the saved pre-migration row hashes. Every listed hash matched the current database record with the same table and primary key.

| Table | ID | Canonical SHA-256 |
|---|---:|---|
| `profile_settings` | 1 | `9f0f4bfc65bda51b041e4e3db5570b122ede8560d9ee4a7e429e39498f7cef95` |
| `projects` | 1 | `66cd6bcdc665ab534b99b0d9a239329aa3510a6d1ff16e817f38b68aae4b4654` |
| `design_items` | 1 | `1a2ed1cecc3891bcb79a7912d3ad40fa6ef2896904a1093e361849a4cdd89a45` |
| `design_items` | 2 | `a4f026632b444225cb512cab24dd62bb78a5ba0d5f2e14022276e9c339afbbe0` |
| `skills` | 1 | `358473b51e47561540b4315bca0918fb55e1a76850c19801591a92b5f306e75e` |
| `skills` | 2 | `4a8026016244decbd1ec3fb772579e356d94e31f99091f9c4b05eacd5a63f322` |
| `skills` | 3 | `c4cfb7215630ad3451a60f827be8dde2811e123bd740383a41497c34f25e1f2e` |
| `skills` | 4 | `519a7778b61638f98602e0bb94c662a16cb1a3cf37200d63e129e7311de6392e` |
| `skills` | 5 | `3fe5933287aeaa5dfafe83f5931c007a6e19d1ce694206ab24e526c2f1b2c58f` |
| `skills` | 6 | `d82e7c9a1565cd7a0a49e9ee85013a6ac2d1f8a5a53b662ca97a042e03c3ef62` |
| `skills` | 7 | `4b17a4c7efce2fdae263e50911a679ebcb4bd6710d0213a3d1351959cfc221af` |
| `skills` | 8 | `6ae19fd08e8ad60caf9db31704a5a6e631217edc22dcad908539042415bba7e2` |
| `skills` | 9 | `c3bb0a22abfccbb83b1bd2051f6d6c65bcd1b468179799375fbfc9e6b38d5e82` |
| `skills` | 10 | `ab1ae2e7cd1c7f5c38a7a2262c9baf6b3874856d38b3eaea8e166ffd81e0599a` |
| `skills` | 11 | `0ba5b0137edd694f1e69e734045dba291d5d53aeac7180a45c85ce4c8319b730` |
| `skills` | 12 | `69024b951c07adfb45283fa1d4e8a716a8e54507fa87af98c33b3ce5c2736df9` |
| `skills` | 13 | `78dd591707bd7bb66ec27cec702dd4c4573e7728ce49e3a60995eb0992c311d2` |
| `skills` | 14 | `7273bd25dc407c423705ad241c502aeb3dac5358c2a9023291d12a3c0bb97c11` |
| `skills` | 15 | `4b0d1ece14be0138f4c61124f96ea4f902c66e5b01f4853e86831f099359f266` |
| `skills` | 16 | `8ae8377f2d564f2f7c081cfaf6a07598be7c409bad98d9fd025ebb6f30b7ee07` |
| `skills` | 17 | `fbf3c58226acd37bb7f195cedf68203680fa3278662b4b604fa2de12e88d3462` |
| `skills` | 18 | `4efb2e6154858f33f2228ec4e670b3c3d80ee3fa99ff09b7b980257ea5b7c8ea` |
| `skills` | 19 | `00903f7c7a691d778c9d30456794bd84b816fe5b5c4c2a51014fb82b0495ffd7` |
| `skills` | 20 | `88e48bf986b989cd48d7bbbfa74dd63b3d3378759c36c9ce20e160f05eda8b98` |
| `skills` | 21 | `f044e364a58c6a7a150888be2deded598616876bce08defe7bad1b49c9042aa1` |
| `skills` | 22 | `1a5f2b100de4f086f215e8e722cf890d38244e9f92aadf8728acfca50c5e939f` |
| `skills` | 23 | `8992e16f8a5204dd992d286592f34b5210dd470f073287014ec6c2c3ad52cba4` |
| `skills` | 24 | `06d9ab23eca0d512e7223bb64d20b175ed62188a4bf1fbf0fe0d8e38b62a250b` |
| `skills` | 25 | `61122f54b958c2756b89d560e42a94766e9ff9f535f071a8ae1e0f7c675d31f8` |
| `skills` | 26 | `3eb548b78dcc11f4b3f4969e27ca7a848e4c16d5099b7fa3a0ce30afad0d324f` |
| `skills` | 27 | `9b153aa32f72276e45c9de1d772e438c1d5c4b57576f9b77b0be4be9f289fc78` |
| `experiences` | 1 | `af68f73b2795d8eb906db40913a9471d7ca9721a350439b39e7dde0d1dd70eb1` |
| `experiences` | 2 | `fb0a114b999cc9bf842fa3aa10f2a31db6fa6f219c64ee847d863a994a05b3ce` |
| `experiences` | 3 | `c43760886bf1133958c6335ae3c4bab6f7e4f1e2f3fa5ccedcb8b41a2c50438d` |

## Argon2 and Netlify function packaging

- Installed `@node-rs/argon2` is **2.2.2**. The lockfile includes the optional `@node-rs/argon2-linux-x64-gnu` package at the same version.
- The authentication test suite successfully hashed and verified passwords on **Windows x64, Node 22.23.4**; correct and incorrect password checks behaved as expected.
- Docker is unavailable. WSL reports version 2, but no Linux distribution is installed. No Linux test environment was installed or enabled.
- `netlify functions:build --src netlify/functions --functions .netlify/functions-build` succeeded and produced five function ZIPs with `nodejs22.x` manifests.
- The function build manifest identifies the host as `win32`/`x64`. The login and setup ZIPs contain the Windows MSVC Argon2 native binary and do **not** contain the Linux x64 GNU binary.
- `netlify.toml` has no explicit `external_node_modules` configuration. Netlify’s local NFT bundler included the platform package installed on this host.

**Linux result: UNVERIFIED.** The lockfile has the Linux GNU package, but neither a Linux hash/verify test nor loading that native binary from a Linux-packaged function could be run. Do not treat the Windows-generated function ZIPs as deployable Linux artifacts. Validate a clean Node 22 build on Linux/Netlify CI before deployment.

## Standalone authentication HTTP tests

The installed CLI help was checked before using `netlify functions:serve --offline`. Handlers were exercised over HTTP at their direct `/.netlify/functions/<name>` endpoints, with disposable generated credentials and a separate temporary NetlifyDB instance. The temporary test database and directory were removed after the run.

| HTTP behavior | Result |
|---|---|
| Setup without configured `ADMIN_SETUP_TOKEN` | 404; setup unavailable |
| Setup with invalid token | 401 |
| Setup with valid disposable token | 201; no session cookie |
| Setup after successful provisioning | 410 |
| Unsupported setup, login, `/me`, and logout methods | 405 |
| Incorrect login credentials | 401 |
| Correct disposable credentials | 200; valid session and CSRF token |
| `/me` without session / with valid session | 401 / 200 |
| Logout with missing / invalid CSRF token | 403 / 403 |
| Successful logout | 204; session cookie cleared |
| `/me` after logout | 401 |
| Failed-attempt persistence and successful-login counter reset | Verified in temporary database |

Every response in the configured-token HTTP matrix carried `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, the configured restrictive CSP, and `Referrer-Policy: no-referrer`. The missing-environment-token 404 was separately verified as no-store. The local session cookie was verified as `HttpOnly` and `SameSite=Lax`; the logout response cleared it.

These are direct function endpoint results. The standalone Functions server does not exercise the `/api/*` rewrite aliases in `netlify.toml`; those rewrites remain unverified. The earlier `netlify dev` attempt did not become ready after the authentication changes. The HTTP harness also emitted `ECONNRESET` log noise when probing the local server port during shutdown; the endpoint assertions passed, the test command exited successfully, and no server or test database remained.

## Authentication migration safety review

### Rate limiting

- Bucket identifiers are namespaced SHA-256 digests of the client IP and normalized submitted identity; raw values are not stored.
- A request reserves IP and identity bucket rows in stable sorted order. Conditional `UPDATE` predicates check recent failures plus in-flight reservations. Failed attempts append timestamps and release reservations in the same transaction; successful login clears both counters and hashed attempt rows.
- `withTransaction()` acquires one pooled client and runs `BEGIN`, all callback queries, and `COMMIT`/`ROLLBACK` on that same client.
- The SQL-level design serializes competing updates to each bucket row and constrains the capacity decision to the conditional update. The 18-test PGlite suite passed concurrent IP and identity threshold tests and reservation-release tests.
- PGlite tests are not a production load test. Lock wait behavior, isolation-level interactions, connection-pool pressure, and burst behavior on managed PostgreSQL still require validation against a non-production managed database.

### One-time setup guard

Provisioning conditionally updates the singleton guard only while `completed_at IS NULL`, then checks the admin count, hashes the password, and inserts the admin inside one transaction. Competing claims serialize on the same row; a failed transaction rolls its claim back. Local concurrency tests passed, but managed PostgreSQL concurrency remains unverified.

## Environment and secret review

Authentication configuration reads only these server-side values: `APP_ENV`, `SITE_ORIGIN`, `SESSION_SECRET`, and `ADMIN_SETUP_TOKEN`.

- `SESSION_SECRET` is required and strength-checked.
- Outside explicit `APP_ENV=development`, `SITE_ORIGIN` must be configured as a bare HTTPS origin; the default environment is production and fails closed.
- The setup endpoint is unavailable when `ADMIN_SETUP_TOKEN` is absent. The setup token is temporary and should be removed after provisioning.
- No tracked `.env` files were found. No authentication/database environment variable references were found in `dist/` or browser JavaScript. No production secret or placeholder production secret was found in the inspected source/configuration.
- No real production values were created or used.

## Passed, failed, and unverified checks

### Passed

- `npm ci` completed under Node 22.23.4.
- `npm run typecheck` passed.
- `npm run test:auth`: **18 passed, 0 failed**.
- `npm run build` passed; `dist/` contains the four explicitly approved static assets.
- Netlify function bundling succeeded for all five `.mts` entry points.
- Migration status, new schema objects, setup-guard state, auth-table state, and all eight portfolio table counts were verified.
- All 34 per-record canonical hashes matched the pre-migration snapshot.
- Synthetic migration-0003 legacy-attempt backfill test passed.
- Standalone HTTP authentication tests passed for the cases listed above.

### Failed or blocked

- `netlify dev` did not become ready in the earlier attempt, so the `/api/*` rewrite routes were not validated through the integrated dev server.
- `npm ci` reported **39 dependency audit findings** (4 low, 14 moderate, 20 high, 1 critical). No automatic audit fix or dependency-version change was made during this phase.

### Unverified

- Linux x64 GNU Argon2 hashing, verification, and loading from a Linux-built function ZIP.
- Authentication concurrency/load behavior on managed PostgreSQL.
- `/api/*` rewrite behavior in Netlify’s integrated development/deployed routing.
- Production deployment/runtime behavior.

## Remaining deployment blockers and next gate

1. Build and test the functions on Linux x64 GNU under Node 22; confirm that the packaged login/setup functions load the Linux Argon2 binary.
2. Exercise `/api/*` rewrites with a working `netlify dev` or a Linux Netlify build.
3. Configure and validate a non-production managed PostgreSQL database before relying on local PGlite concurrency results.
4. Review and resolve the dependency audit findings, especially the critical finding, before deployment.
5. Provision production secrets only through the deployment platform; do not commit them. Create the first admin only after the setup endpoint and deployment environment have been verified.

The Netlify Database CLI currently reports `enabled: false` and target `local`; no managed database was provisioned or contacted during this phase.
