# Clyde Nefoti — Professional Portfolio

Local portfolio and private content system for XAMPP. The public site reads published MySQL content. Sign in to add and edit that content.

## Requirements

- XAMPP with Apache, MySQL, and PHP 8.2
- The project folder at `C:\xampp\htdocs\clyde-portfolio`

## Install

1. Start **Apache** and **MySQL** from the XAMPP Control Panel.

2. Copy the example configuration:

   ```text
   copy config\config.example.php config\config.php
   ```

   Edit only `config\config.php`. Leave `config\config.example.php` unchanged.

3. Create the database, then create its tables. In PowerShell:

   ```text
   C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE clyde_portfolio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   C:\xampp\mysql\bin\mysql.exe -u root clyde_portfolio < database\schema.sql
   ```

   If the MySQL root account has a password, add `-p` to each command and enter it when asked.

   phpMyAdmin alternative: create and select the `clyde_portfolio` database, choose **Import**, and import `database\schema.sql`.

4. Load the CV-backed starting content or align earlier seed content with the supplied CV. The script inserts missing records and preserves content edited in the dashboard:

   ```text
   C:\xampp\php\php.exe scripts\seed_content.php
   ```

   If this database was created before content editing was added, import `database\migrations\2026_10_19_content_fields.sql` once. If it was created before certificate display images, import `database\migrations\2026_10_20_certificate_display_image.sql` once. A new import of `schema.sql` already includes those columns, so do not run either migration again after a fresh schema import.

5. Create your administrator account. The script asks for your name, sign-in email, and a password of at least 12 characters. It asks you to confirm the password and does not accept a public registration form:

   ```text
   C:\xampp\php\php.exe scripts\create_admin.php
   ```

6. Open the site:

   [http://localhost/clyde-portfolio/public/](http://localhost/clyde-portfolio/public/)

   Administrator sign-in:

   [http://localhost/clyde-portfolio/public/admin/login](http://localhost/clyde-portfolio/public/admin/login)

If rewrite rules are unavailable, the same routes work with `index.php?r=`, for example `http://localhost/clyde-portfolio/public/index.php?r=/admin/login`.

## Configuration values

Set these in `config\config.php`:

| Key | Local value | Change it when |
| --- | --- | --- |
| `app_name` | `Clyde Nefoti` | You want a different browser and header name |
| `base_url` | `http://localhost/clyde-portfolio/public` | The folder or host changes. No trailing slash is required |
| `db_host` | `127.0.0.1` | MySQL is not on this computer |
| `db_name` | `clyde_portfolio` | You use a different database name |
| `db_user` | `root` | You create a dedicated MySQL user |
| `db_pass` | empty | The MySQL account has a password |
| `environment` | `development` | The site is no longer only on your machine. Use `production` |

`config\config.php` is listed in `.gitignore`. Do not commit database passwords.

## What the seed contains

Published starting content reflects the supplied professional CV:

- Profile summary, headline, and Madang location
- The TeleHealth PNG capstone project, including its published live link
- Skills grouped by web and databases, tools and platforms, systems analysis, coursework exposure, design, and professional skills
- Independent design work, student association leadership, and the Divine Word University degree

Left empty or unpublished:

- Certificates, because none are listed on the CV
- NCRA, until you supply accurate details
- Public email, phone, LinkedIn, GitHub, resume, and profile image, because the CV still has placeholders
- TeleHealth source code, because the CV records Git and GitHub for version control but no repository address. The live site is the CV link `https://mbphatelehealth.com`
- Lodestar Studio and the tableware logo contest, saved as drafts without images

The earlier WPU project and helpdesk placement are archived as drafts because they are not listed in the supplied CV. Their records remain available in the dashboard. Run `scripts\seed_content.php` again to add missing starting rows or align known original seed text. It will not overwrite dashboard-edited content, and it will not add certificates or NCRA.

## Private folders

These paths are denied by Apache and are not application URLs:

- `http://localhost/clyde-portfolio/app/`
- `http://localhost/clyde-portfolio/config/`
- `http://localhost/clyde-portfolio/database/`
- `http://localhost/clyde-portfolio/scripts/`
- `http://localhost/clyde-portfolio/storage/`

Uploaded files belong in `public\uploads\`. PHP files in that folder are denied by `public\uploads\.htaccess`.

## Check PHP syntax

```text
Get-ChildItem -Recurse -Filter *.php | ForEach-Object { C:\xampp\php\php.exe -l $_.FullName }
```

## Vercel deployment

The project uses the community `vercel-php@0.9.0` runtime (PHP 8.5) with `api\index.php` forwarding requests to the existing `public\index.php` front controller. Vercel is not a traditional PHP host: function instances are temporary, and their writable filesystem is not persistent. The admin CMS therefore requires a reachable MySQL-compatible database, database-backed sessions and login throttling, and Blob storage for new uploads. The deployment configuration does not create services, import data, or run database migrations.

### Free-tier services and limits

- **MySQL-compatible database:** TiDB Cloud Starter has a free plan and speaks the MySQL protocol, but it is not identical to MySQL. Availability, quotas, compatibility, and free-plan terms can change. Test the schema and application queries against a separate instance before relying on it; never point an initial test at the only copy of your production data.
- **Uploads:** Vercel Blob Hobby currently includes a limited free allowance. Admin file uploads use browser-direct uploads because Vercel Functions limit request bodies to 4.5 MB. Blob objects are public, matching the portfolio's existing public media behavior. Existing ignored `public\uploads` files are not included in Git deployments and must be copied to Blob and their database paths updated manually if they should remain online.
- The application does not automatically delete unreferenced Blob objects. Remove obsolete objects from the Blob dashboard to control usage. Local filesystem uploads continue to work when `SESSION_DRIVER=files`.

Free-tier allowances and provider terms are not guaranteed to remain free or unchanged. No provider account, database, or Blob store is created by this repository configuration.
The deployment does not copy the existing local database; export and import data to the external provider yourself only after taking a verified backup and reviewing that provider's compatibility and terms.

### Vercel project setup

1. Import this repository into Vercel with the project root set to the repository root. Keep the configured build command `npm run build`; Vercel installs the pinned Node dependencies and bundles the browser upload client.
2. Connect a Vercel Blob **public** store to the project. Set the store's `BLOB_READ_WRITE_TOKEN` environment variable in the Vercel project.
3. Create or choose an external MySQL-compatible database. Apply `database\migrations\2026_10_28_vercel_sessions_and_login_attempts.sql` manually after the application's existing schema is present. For a new database, import `database\schema.sql` instead; it already includes the two additional tables. Do not run both paths for the same database.
4. Set the production environment variables below. Set `BASE_URL` to the canonical HTTPS site URL, and `BLOB_BASE_URL` to the HTTPS origin of the connected public Blob store (for example, `https://<store-id>.public.blob.vercel-storage.com`).
5. Before switching traffic, verify database connectivity, TLS, the admin login, every public route, static assets, and uploads in a Vercel preview deployment. The repository does not claim that a deployment has already been tested.

Required Vercel environment variable names:

| Name | Purpose |
| --- | --- |
| `APP_ENV` | Set to `production` |
| `BASE_URL` | Canonical HTTPS site URL |
| `DB_HOST` | External database hostname |
| `DB_PORT` | External database port |
| `DB_NAME` | Application database name |
| `DB_USER` | Dedicated application database user |
| `DB_PASS` | Database password |
| `DB_SSL` | Set to `true` when the provider requires TLS |
| `SESSION_DRIVER` | Set to `database` for Vercel |
| `BLOB_BASE_URL` | Public Blob store origin, with no trailing slash |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token used by the SDK |
| `BLOB_UPLOAD_SECRET` | Random secret of at least 32 characters used to sign short-lived admin upload authorization tokens |

`DB_SSL_CA` is optional and is only needed if the database provider requires a CA certificate file path. Do not put database credentials, Blob tokens, or upload-signing secrets in Git. Vercel injects `VERCEL`; application logs are sent to the platform log stream rather than written to the function filesystem.

Vercel's PHP runtime is community-maintained, not an official Vercel PHP runtime. The app still needs an external database and Blob store, and the free-tier database and storage have independent limits. This configuration is deployment preparation only; it is not a verified Vercel deployment.
