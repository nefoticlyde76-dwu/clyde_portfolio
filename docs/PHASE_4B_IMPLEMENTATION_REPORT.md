# Phase 4B — Netlify Dashboard and Public Portfolio Implementation

## Status

Phase 4B implementation is present in the `migration/netlify` worktree. Local
type, test, build, function-package, and browser-smoke checks are recorded below.
This is not a production or managed-service acceptance report. No production
database, Netlify Blob store, deploy, or permanent administrator was used.

The Phase 4A feature-parity matrix remains an audit-time snapshot. See
`PHASE_4_ADMIN_DASHBOARD_IMPLEMENTATION_REPORT.md` for the module audit and
`PHASE_4_FINAL_ACCEPTANCE_REPORT.md` for current acceptance status and remaining
deployment requirements.

## Implemented

- Added authenticated content APIs for profile settings, overview metrics,
  projects, certificates, design items, skills, experience, and contact-message
  review/read/delete operations. The endpoints reuse the existing session,
  origin, CSRF, database transaction, and HTTP error helpers.
- Added validated resource schemas, explicit SQL projections, bounded search
  and pagination, public-only content projections, and reference-gated media
  delivery.
- Added Netlify Blobs-backed authenticated media upload and delete handlers.
  Uploads use generated keys, content signatures, purpose-specific prefixes,
  and a 4 MiB limit. Existing local uploads are not copied into the public
  build because the migration inventory found five orphan files without
  database references. No CV or orphan was inferred, migrated, or published.
- Added the additive `0004_contact_rate_limits.sql` migration and a public
  contact endpoint with a honeypot, bounded input validation, exact origin
  checks, and hashed IP/email rate-limit buckets. The endpoint stores messages;
  it does not send email.
- Replaced the admin placeholder with a responsive dashboard covering
  overview, profile, content CRUD, message review, media/CV controls, search,
  filtering, pagination, status changes, destructive-action confirmation, and
  sign-out.
- Added a static public entry point and route-aware views for home, about,
  projects/detail, design, certificates/detail, experience, and contact.
  Public content is fetched from published-only endpoints. Dynamic values are
  inserted with DOM text APIs, not HTML interpolation. Certificate cards use
  an image credential as their display image when no separate display image
  exists, matching the legacy PHP renderer.
- Added sitemap and robots functions and explicit Netlify redirects for the
  API, admin pages, and client-side public routes.
- Updated the Netlify static build allowlist to include the new pages and
  dashboard assets while excluding the PHP application and unreferenced
  `public/uploads` files.
- Expanded isolated integration coverage in `tests/content.test.mts`.

## Local validation

| Check | Result | Evidence |
|---|---|---|
| TypeScript | PASS | `npm run typecheck` |
| Authentication regression | PASS | `npm run test:auth` — 18 passed, 0 failed |
| Content/API regression | PASS | `npm run test:content` — isolated ephemeral database; one integration test covers authenticated CRUD, public visibility, contact validation/throttling, media guards, and transaction rollback |
| Production build | PASS | `npm run build`; static output contains the public/admin entry points and approved assets |
| JavaScript syntax | PASS | `node --check` on the dashboard, public-site, and build scripts |
| Function packaging | PASS locally | `npx netlify functions:build --src netlify/functions --functions .netlify/functions`; manifest contains 12 functions |
| Browser smoke | NOT VERIFIED | Prior mock-backed smoke covered public home, project list/detail, contact submission, dashboard overview/project creation, mobile navigation, and a narrow viewport; not every module or failure state |
| Whitespace | PASS | `git diff --check` |

These are local Windows checks. The browser test used disposable mock API
responses, not imported portfolio content or Netlify services. Local function
packaging does not prove a deployed Netlify runtime or managed PostgreSQL/Blob
behavior.

The GitHub Actions workflow `verify-linux-auth.yml` has been extended to run
both test suites, the production build, and packaging/import checks for all 12
functions on Ubuntu. Hosted execution remains pending.

## Explicitly unverified

- End-to-end behavior against a managed PostgreSQL database and Netlify Blobs,
  including upload, replacement cleanup, orphan cleanup, and public delivery.
- Deployment routing, redirects, headers, browser behavior on the target
  Netlify site, and interaction with the production domain.
- Full browser coverage for every module and every validation/error state.
- Actual execution of the expanded Linux workflow on a GitHub-hosted runner.
- The image/PDF upload limit is 4 MiB. The PHP application permits larger
  uploads for some types; parity above 4 MiB is intentionally not claimed.
- Association and publication of the five inventoried orphan media files.
  They remain excluded until reviewed and explicitly linked by an authorized
  administrator.
- Exact dashboard count/order parity against managed data and a complete
  visual comparison with the PHP site.

## Safety and database status

All integration tests use a disposable in-memory/local database adapter and
remove their test fixtures when complete. The persistent imported portfolio
database and production PostgreSQL were not accessed or changed. The test
administrator exists only in the isolated test adapter. No permanent
administrator was provisioned, and no deployment occurred.

The managed PostgreSQL migration/application validation remains outstanding.
Use an isolated Netlify deploy preview and an isolated managed database only
after explicit approval. Production database access and deployment remain
outside this phase.
