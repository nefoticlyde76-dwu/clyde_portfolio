# Phase 4A — Legacy Admin Audit and Migration Blueprint

## Status and scope

This audit is based on the checked-in PHP routes, controllers, models, templates,
database schema, and Netlify implementation. Phase 4A established the intended
parity. The companion Phase 4 implementation and acceptance reports record what
has since been implemented, locally validated, and remains unverified. Current
module-by-module status is in `PHASE_4_ADMIN_DASHBOARD_IMPLEMENTATION_REPORT.md`
and `PHASE_4_FINAL_ACCEPTANCE_REPORT.md`.

The local starting point for this work was branch `migration/netlify` at
`8a47a16bcd21262e4e953b27be6ba271442ccbf8`. The existing root `.htaccess`
deletion and four pre-existing untracked paths were present before Phase 4
implementation and are preserved. Phase 4 used only disposable local test
fixtures. It did not modify the persistent imported database, provision an
administrator outside tests, or deploy.

## Legacy application inventory

The PHP application is a small MVC site:

- `app/Core/routes.php` registers public pages, the contact POST, admin login and
  logout, dashboard, resource CRUD, publication actions, media, and messages.
- `app/Core/Router.php` dispatches GET and POST routes; `app/Core/Controller.php`
  and `app/Core/View.php` render the layouts and templates.
- `app/Core/Database.php` connects to MySQL with prepared statements;
  `app/Core/DatabaseSessionHandler.php` supports database-backed sessions.
- `app/Core/Input.php`, `Validator.php`, `Upload.php`, `Catalog.php`, and
  `helpers.php` provide input handling, validation, upload storage, fixed option
  lists, escaping, session/CSRF helpers, URL handling, media paths, and paging.
- `app/Controllers/Admin/` contains authentication, dashboard, profile,
  project, certificate, design, skill, experience, and message handlers.
- `app/Models/` contains the corresponding MySQL access, including `Stats`.
- `app/Views/admin/`, `app/Views/layouts/admin.php`, and
  `app/Views/partials/admin-nav.php` implement the server-rendered admin UX.
- Public controllers and templates implement `/`, `/about`, `/projects`,
  `/projects/{slug}`, `/design`, `/certificates`, `/certificates/{id}`,
  `/experience`, `/contact`, `/sitemap.xml`, and `/robots.txt`.

The PHP models use explicit parameterized statements for writes and searches,
but some `find()` methods use `SELECT *`. The Netlify API should use explicit
column lists. The admin base controller requires a session and mutating PHP
forms use CSRF validation. Destructive operations use a confirmation page and
POST. Published/draft is an explicit content state, not an archive state.

### Original portfolio data shape

`database/schema.sql` defines eight portfolio tables: `admins`,
`profile_settings`, `projects`, `certificates`, `design_items`, `skills`,
`experiences`, and `contact_messages`. It also defines PHP-session and login
throttle tables that are replaced by the Netlify auth migrations. Portfolio
tables are intentionally independent and have no foreign keys between them.
The PostgreSQL migration `0001_portfolio_schema.sql` is the established target
schema and includes the content columns listed below. Existing auth migrations
`0002_auth_support.sql` and `0003_auth_atomicity.sql` must remain unchanged.

The migration importer documents the previously imported baseline: 1 profile,
1 project, 0 certificates, 2 design items, 27 skills, 3 experiences, 0 contact
messages, and 0 administrators (34 portfolio records total). It refuses to
import into non-empty portfolio tables. This audit did not connect to either
the persistent imported database or production.

## Feature-parity matrix

The matrix below is the original Phase 4A audit snapshot, written before the
implementation work. Current delivery and validation status is tracked in
`PHASE_4_ADMIN_DASHBOARD_IMPLEMENTATION_REPORT.md`,
`PHASE_4B_IMPLEMENTATION_REPORT.md`, and `PHASE_4_FINAL_ACCEPTANCE_REPORT.md`.

| Existing PHP module | Original controller / model / view | Existing table(s) | Public-facing dependency | Netlify API and PostgreSQL operations | Frontend page | Upload / storage | Validation and security | Status and acceptance evidence |
|---|---|---|---|---|---|---|---|---|
| Dashboard overview | `Admin/DashboardController`, `Models/Stats`, `admin/dashboard.php` | Projects, certificates, design items, skills, experiences, messages | Published/draft counts; unread count; latest projects and messages | Authenticated overview read; grouped counts and bounded recent-row queries | Overview | None | Session required; message excerpts remain escaped/text-only; exact metrics must match PHP `Stats` | Not migrated. Test counts and recent rows against the isolated database fixture. |
| Profile settings | `Admin/ProfileAdminController`, `Models/Profile`, `admin/profile/form.php` | Singleton `profile_settings` row (`id=1`) | Full name, headline, intro, biography, location, public email/phone, LinkedIn/GitHub, profile image, SEO | Authenticated profile GET and validated update/upsert of row `id=1` | Profile Settings | Profile image; key under a generated profile prefix | Required name/headline/intro; bounded strings; email, phone and HTTPS/HTTP URL validation; session + CSRF + same-origin; output escaped | Not migrated. Test create/read/update and public projection; preserve omitted optional values according to legacy form semantics. |
| Projects | `ProjectAdminController`, `Models/Project`, project index/form/show templates | `projects` | Published list, featured selection, slug detail, metadata, project image | Authenticated paginated list/get/create/update/status/delete; public published list/detail | Projects | Cover image, public only for a published record | Required title/category/summary; unique lowercase slug; bounded narrative fields; safe URLs; status allowlist; order range; validated image; CSRF | Not migrated. Test all CRUD, unique slug, status visibility, ordering, public detail, image replacement/deletion. Delete is permanent; draft is the non-destructive hide option. |
| Certificates | `CertificateAdminController`, `Models/Certificate`, certificate index/form/show templates | `certificates` | Published cards/detail, issue date, credential link/id, description, file and display image | Authenticated paginated list/get/create/update/status/delete; public published list/detail | Certificates | Optional certificate image/PDF and display image | Required title/issuer; real date; unique optional credential ID; safe URL; allowed status/order; image/PDF content validation; CSRF | Not migrated. Test CRUD, duplicate credential ID, public draft filtering, and both files. Display image is distinct from credential file. |
| Graphic design gallery | `DesignAdminController`, `Models/DesignItem`, design index/form/show templates | `design_items` | Published gallery, category, description, image, feature/order | Authenticated paginated list/get/create/update/status/delete; public published gallery | Graphic Design | Image required before publishing; key under design prefix | Required title/category; bounded description; safe optional external URL; boolean feature; image MIME/content/size; CSRF | Not migrated. Test CRUD, image required to publish, category filter, ordering, and draft exclusion. |
| Skills | `SkillAdminController`, `Models/Skill`, skill index/form/show templates | `skills` | Published skills grouped by category and display order | Authenticated paginated list/get/create/update/status/delete; public grouped list | Skills | None | Required name; existing category values plus preserved categories already in use; unique `(category,name)`; status/order allowlists; CSRF | Not migrated. No proficiency value exists in schema or PHP UX; do not add one. Test category uniqueness and grouping. |
| Experience | `ExperienceAdminController`, `Models/Experience`, experience index/form/show templates | `experiences` | Published work, placement, freelance, leadership/volunteer, and education items | Authenticated paginated list/get/create/update/status/delete; public published list | Experience | None | Required title/organization; catalog type with legacy unknown values retained on edit; valid date order; current role cannot have end date; period label preserved/generated; status/order; CSRF | Not migrated. Test type preservation, generated labels, dates, ordering, and draft exclusion. |
| Contact messages | `ContactController`, `MessageAdminController`, `Models/ContactMessage`, public contact and admin message templates | `contact_messages` | Public form submission; admin list, detail, read/unread, delete | Public rate-limited validated create; protected paginated list/get/read toggle/delete | Contact Messages | None | Public name/email/subject/message bounds, honeypot and rate limits; admin session + CSRF/origin; render message as text; no email is sent | Not migrated. Test public validation/rate limits, stored XSS safety, admin isolation, read state and delete. |
| Media/profile image | `ProfileAdminController::media`, `Upload`, PHP blob-upload endpoint/client, media form | Paths in profile/project/certificate/design rows; no media table | Referenced images/files and profile image | Authenticated upload and delete/reference metadata; public media delivery only after published-record lookup | Media | Legacy direct uploads plus Vercel Blob client upload; target must use Netlify Blobs | Generated keys only; validate bytes, extension, size; require auth/CSRF; do not trust browser MIME/name; no arbitrary listing/file browser | Not migrated. Current browser uploader and config are Vercel-specific; replace with Netlify Blobs only after checking installed API and behavior. |
| CV/resume | `ProfileAdminController::media/updateResume`, `Models/Profile`, media form | `profile_settings.resume_path` | No public download link is rendered by the inspected PHP pages | Protected metadata read/update; public media access only for an explicitly referenced saved CV | Media and CV | PDF under generated resume prefix | PDF bytes, size limit, auth/CSRF, replacement ordering; never infer or publish a missing path | Admin management is migrated. The inspected PHP application does not render a public CV link; the Netlify frontend preserves that behavior. No file is assumed to exist. Blob transfer remains unverified. |
| Authentication | `AuthController`, `Models/Admin`, PHP session helpers; replaced for target by existing Netlify auth functions | `admins`; PHP session/throttle tables replaced by auth tables | None | Existing setup/login/logout/me functions and migrations | Login and authenticated shell | None | Existing Argon2id, server-side sessions, expiry/revocation, CSRF, origin, rate limit, secure cookie; do not rewrite or bypass | Existing Netlify implementation; keep unchanged and use its guards per endpoint. Existing setup remains the only first-admin provisioning path. |

### Legacy validation and UX details to preserve

- Admin list pages are searchable/filterable and paginated (projects and
  certificates: 12; designs, skills, and experience: 12; messages: 15).
- Status, category, experience type, and read-state filters are allowlisted.
- Titles, descriptions, labels, date/date ranges, URLs, credential uniqueness,
  slugs, and display order are server-validated in the PHP controllers.
- Projects and certificates may be drafts without a file; design pieces require
  an image to publish.
- Profile settings have one row, with the original code creating it on first
  save.
- The contact form saves messages and explicitly tells visitors that it does
  not email them.
- Public templates escape dynamic values with `e()`. The target browser UI must
  use safe DOM/text APIs rather than interpolating database strings into HTML.

## Pre-Phase 4 implementation snapshot and gaps found

- `netlify/lib/database.mts` provides the established `@netlify/database`
  client, parameterized SQL interface, transactions, and row types for the
  eight existing portfolio tables.
- `netlify/functions/admin/*` contains the existing setup/login/logout/me
  handlers. `netlify/lib/auth/guards.mts` exposes the session, origin, and CSRF
  checks needed by protected APIs.
- `netlify/database/migrations/0001_portfolio_schema.sql` already creates the
  portfolio schema. No content-schema duplication is justified by this audit.
- `netlify.toml` currently routes health and auth endpoints only. No dashboard
  CRUD, public content, contact submission, or media endpoint exists.
- `public/admin/index.html` is an authenticated placeholder; it does not yet
  provide dashboard navigation or resource management.
- `scripts/build-netlify.mjs` copies only the auth pages and a small explicit
  CSS/JS allowlist. It does not publish the PHP portfolio routes or templates.
  Netlify cannot execute the PHP front controller. The public site therefore
  requires a static HTML/vanilla-JS integration with public read APIs; leaving
  the PHP pages as-is would not preserve them on Netlify.
- Existing upload handling (`api/blob-upload.js`, `public/assets/js/admin-blob-upload.js`,
  and `@vercel/blob`) is Vercel-specific. The current CLI dependency tree
  contains `@netlify/blobs` transitively, but the project has no direct Netlify
  Blobs integration. The supported installed interface must be inspected
  before using it, and any direct dependency must be deliberate.
- The public PHP site references profile, project, certificate, gallery, and
  resume media paths. Original assets must not be overwritten. Five previously
  identified orphaned media files have unresolved record associations; do not
  infer associations from filenames. There is no confirmed saved CV path.

## Target architecture and endpoint contract

Keep the existing static HTML, CSS, Bootstrap 5, and vanilla JavaScript
approach. Reuse the current auth pages and server-side database layer. Do not
introduce a UI/backend framework or duplicate the eight-table schema.

1. **Protected admin API:** add server-side resource operations for the
   dashboard overview, profile, projects, certificates, designs, skills,
   experience, contact messages, and constrained media/CV metadata. Every
   protected request must call the existing session guard; mutations must
   additionally enforce same-origin, CSRF, and method validation. Use explicit
   column selections and bounded pagination. Return only the fields needed by
   the admin UI; never include password hashes, session tokens, or database
   details.
2. **Public read API:** expose only public profile fields and records whose
   status is `published`. Preserve project slugs and public ordering. Return
   only intended public fields; messages and drafts must never be exposed.
3. **Contact API:** accept only validated public submissions, enforce server
   rate limits, store with parameterized SQL, and do not provide public access
   to message listing/detail endpoints.
4. **Media boundary:** use the supported Netlify Blobs API from server-side
   functions. Generate object keys, validate file content/type/size, authorize
   upload/delete, and persist the key in existing path columns. Serve public
   images or the explicitly saved CV through a handler that verifies a
   currently published database reference; never make arbitrary/private blobs
   public. Avoid a general-purpose storage browser.
5. **Storage consistency:** upload a replacement object before updating its
   database reference; if the database update fails, delete the new object and
   keep the previous reference. After a successful database commit, remove the
   prior object; if blob deletion fails, log/report an orphan without restoring
   the old database value. Blob and SQL transactions cannot be atomic together.
6. **Static front end:** replace the protected placeholder with a responsive
   shell and only functional navigation. Build forms/lists with safe DOM
   operations. Add public pages that preserve existing routes and retrieve
   public data through the read API. Keep route-specific headings, metadata,
   content sections, media, and the original contact flow.
7. **Configuration:** do not embed secrets in client code. Use Netlify's
   database configuration and environment-only auth/storage configuration.
   Do not add a setup UI or provision an administrator.

No schema migration is currently justified for dashboard CRUD. If storage
metadata or a demonstrably necessary feature requires a schema change, add an
additive numbered migration, describe the reason and rollback, and never edit
the already-applied `0001`–`0003` migrations.

## Security and integrity requirements

- Parameterized SQL only; dynamic table/column/order names come only from
  explicit code allowlists.
- Validate all request bodies, IDs, pagination, status/category/type choices,
  dates, text sizes, URL protocols, and file content server-side.
- Use the existing auth library unchanged; guard every protected function
  independently. Require Origin on mutations and CSRF in the established
  `X-CSRF-Token` header.
- Return no-store for admin or private responses; keep public cache policy
  deliberate and avoid caching drafts or contact data.
- Render untrusted content as text. No unsafe `innerHTML` on database content.
- Preserve imported rows and relationships; do not seed fabricated portfolio
  content, run importer against an existing/non-empty database, or use
  production credentials.
- Keep original assets and the five unresolved files unchanged until a
  verified association is provided. Do not publish an unconfirmed CV.
- Never create a persistent administrator. Auth tests may provision only
  disposable records in their isolated ephemeral adapter.

## Implementation and verification plan

1. Dashboard foundation: authenticated responsive navigation, overview,
   loading/empty/error states, and logout using the current auth API.
2. Database-backed content APIs and UI: profile, projects, certificates,
   design, skills, experience, contact list/detail/read/delete.
3. Inspect and integrate Netlify Blobs; implement guarded uploads and public
   asset delivery while preserving replacement consistency.
4. Add the controlled CV upload/replace/remove flow without assuming any
   existing resume asset.
5. Add public read endpoints and route-preserving static pages for all existing
   public modules; migrate contact submission to the function.
6. Add isolated tests for authorization, validation, CRUD, public filtering,
   XSS-safe rendering, file validation, blob/database failures, contact rate
   limiting, and imported-record preservation.
7. Verify typecheck, auth and new tests, production build, function packaging,
   diff whitespace, and responsive/browser behavior where a browser runtime is
   available. Record unavailable Netlify/managed Postgres/Blob behavior as
   unverified, not passed.

## Audit ambiguities and conservative decisions

- The schema has no archive/deleted timestamp; the UI has explicit delete and
  draft/published state. Retain permanent delete only with confirmation and use
  draft to hide a record.
- Skills have no proficiency column and the PHP form explicitly says
  percentages are not used; do not add proficiency values.
- Experience permits stored legacy types in edit options, so do not silently
  drop unknown imported type values.
- The profile image is edited in profile settings while the media screen shows
  it read-only and manages the resume. Keep those responsibilities.
- The certificate file and display card image are separate fields; preserve
  both, and preserve the legacy fallback where a certificate image can be its
  public card when no display image is present.
- No record association can safely be inferred for the five orphaned assets.
- The current verified Linux run validates authentication and function
  packaging only; it does not validate managed PostgreSQL, Netlify Blobs,
  dashboard behavior, or a deployed site.
