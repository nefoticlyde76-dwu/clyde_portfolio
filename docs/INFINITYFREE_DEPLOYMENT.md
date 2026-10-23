# InfinityFree deployment

This guide deploys the existing PHP MVC application without server-side Composer, SSH, shell access, or environment variables. Do not treat deployment as complete until the hosting account's PHP version, extensions, MySQL version, database host, HTTPS certificate, and writable-directory behavior have been checked in the control panel.

## Compatibility and included dependencies

- The code requires **PHP 8.1 or newer**. It uses PHP 8.1 `never` return types, PHP 8.0 syntax, and standard PHP functions.
- Required PHP extensions: `pdo_mysql`, `mbstring`, `fileinfo`, and `session`. The app also uses standard PHP core functionality such as `json`, `filter`, `hash`, and `random_bytes`.
- The schema uses InnoDB, `utf8mb4`, `DATETIME` current-timestamp defaults, and standard indexes. Use **MySQL 5.7 or newer** or **MariaDB 10.2 or newer**.
- The repository has no Composer manifest, `vendor/` directory, or third-party PHP packages. There is nothing to install with Composer; upload the application PHP files as-is.
- The workflow installs `lftp` on its temporary GitHub-hosted Ubuntu runner for FTPS transfers; it does not require a shell, Composer, or command-line tools on InfinityFree.
- The hosting account's exact PHP/MySQL versions and extension availability cannot be read from this local checkout. Check the account's PHP selector / PHP information and database panel before deploying. Do not continue if any minimum above is unavailable.
- Apache must allow `.htaccess` and `mod_rewrite`. The included `public/.htaccess` routes non-file requests to `index.php`.

## Exact upload layout

InfinityFree requires website files to be inside the domain's `htdocs` directory. The application source and runtime data therefore live below the document root, protected from direct HTTP access by Apache rules:

```text
FTP account root/
`-- clyde-nefoti.wuaze.com/
   `-- htdocs/                 # FTP target and domain document root
       |-- .htaccess           # router and private-path protections
       |-- index.php
       |-- app/                # PHP source; direct HTTP requests denied
       |-- config/             # config/database.php and private config.php; denied
       |-- storage/            # logs/cache; denied
       |-- assets/
       `-- uploads/            # production uploads preserved by deployments
```

InfinityFree's [FTP guide](https://forum.infinityfree.com/t/how-to-upload-files-with-ftp/49306) gives domain-specific paths such as `/example.com/htdocs`. For this site, the workflow defaults to `/clyde-nefoti.wuaze.com/htdocs/`, not a server Unix home directory. Verify the FTP-visible path for this exact domain in the account's FTP client/File Manager before enabling uploads. If the FTP account opens directly inside this domain's folder, set the repository Actions variable `FTP_TARGET_DIR` to `./htdocs/` instead. The account's FTP listing is not available from this repository, so the default must be confirmed before enabling live transfers.

The workflow packages the app under the selected FTP target (which is `htdocs`), copying `app/`, `config/`, and `storage/` alongside the contents of `public/`. It explicitly excludes `public/uploads` from rsync, then rebuilds only the temporary package's `uploads/` directory with `.htaccess` protection files and `.gitkeep` placeholders. `public/.htaccess` becomes the document root's `.htaccess`. Its rules deny HTTP requests to `/app`, `/config`, and `/storage`, and block script-like extensions under `/uploads`; each private directory also has its own deny rule. PHP filesystem includes continue to work. The front controller supports both this layout and local XAMPP, where `app/` is a sibling of `public/`.

The deployment package includes `config/config.example.php` but never `config/config.php`. Create the latter through the hosting File Manager with production database settings before live deployment. It is under `config/` and protected by both the directory `.htaccess` and root rewrite rule. Database schema, migrations, scripts, docs, `.git`, database exports, local logs, and local upload media are not packaged.

## Automatic deployment with GitHub Actions

The repository's deployment branch is `main`. The workflow at `.github/workflows/deploy-infinityfree.yml` runs a dry run on pushes to `main` and on manual dispatch. It packages the app and runtime directories inside the domain's `htdocs`; it does not package `config/config.php`, database/schema files, scripts, docs, local uploads, logs, or Git metadata. No Composer packages are needed.

In the repository's **Settings → Secrets and variables → Actions → Variables**, configure:

- `FTP_TARGET_DIR`: optional override for the FTP-visible target directory. It defaults to `/clyde-nefoti.wuaze.com/htdocs/`; the only supported alternate is `./htdocs/` when the FTP account opens in this domain's directory. Verify in the FTP account before enabling live upload; never use a server Unix home path.
- `FTP_DEPLOY_ENABLED`: leave unset or not equal to `true` initially. The workflow only runs a dry run unless explicitly set to `true`.

Create these **repository Actions secrets** in the same page:

- `FTP_SERVER`: the FTP hostname shown in the hosting account's FTP details (InfinityFree's FTP guide lists `ftpupload.net`).
- `FTP_USERNAME`: the hosting account's FTP username.
- `FTP_PASSWORD`: the FTP password from the hosting account/client-area details; never put it in workflow YAML.

The workflow uses explicit FTPS with certificate validation through `lftp`. The FTP hostname shown in the account's FTP details is normally `ftpupload.net`; use the hostname matching the server certificate. SFTP/SSH is not used. It previews an upload-only sync before any live transfer. Unlike a mirror action that tracks removals, the upload command never deletes remote files. It excludes all `.htaccess` files (to preserve host-specific rules), `config/config.php`, storage logs/cache data, and local upload media. Existing production uploads are not included or overwritten. Other existing files with names in the package can be overwritten when their local versions change.

Before enabling uploads:

1. In InfinityFree's FTP account, verify the intended domain path is `clyde-nefoti.wuaze.com/htdocs`. Set `FTP_TARGET_DIR=./htdocs/` only if the FTP account already opens inside the domain's directory; do not use a Unix home directory.
2. Add the three secrets and verify the FTP server name and target path.
3. Create `config/config.php` inside the target's `config/` directory with the production database settings below. The workflow never includes or overwrites this file.
4. Review and back up existing hosting files. Check for a default `index.html` that could take precedence over `index.php`.
5. In the hosting File Manager, merge the required rules from the repository's `public/.htaccess` and private-directory `.htaccess` files with any existing host rules. The workflow intentionally never uploads `.htaccess`; ensure the merged root rules deny `/app`, `/config`, and `/storage` and block executable upload extensions before exposing runtime files below `htdocs`.
6. Run the workflow manually with `confirm_deploy` unchecked and `FTP_DEPLOY_ENABLED` unset/not `true`. Review the target and every proposed upload. The dry run does not change hosting files.
7. After confirming the target and package, creating `config/config.php`, and installing the required access rules, set `FTP_DEPLOY_ENABLED` to `true`. On manual runs, also check `confirm_deploy`; pushes to `main` then upload automatically. Every run previews the upload before the gated transfer.

The workflow does not install server-side dependencies, run migrations, import SQL, transfer database content, or upload administrator/contact data. Provision the production schema, account, and initial administrator separately as described above. No remote files are deleted; production uploads, database content, logs, cache, and `config/config.php` are not part of the upload package.

### Migrating local uploaded media

The repository ignores CMS-uploaded files under `public/uploads`; they are local runtime data, not source assets. The deployment package intentionally excludes them, so a new/empty hosting account will not receive images or documents referenced by migrated database rows. If migrating content, first review which `uploads/...` paths its rows use, then transfer only those required files separately to the matching `htdocs/uploads/{projects,certificates,designs,profile,resume}/` folders using the hosting File Manager or FTP. Back up the production files first, verify matching paths and contents, and do not replace existing production uploads unintentionally. This manual media transfer is separate from Actions deployment and never copies local uploads wholesale.

## Configure the production database

1. In the hosting control panel, create a MySQL database and user. Copy the exact database host, database name, username, and password shown there. Shared hosts commonly add account prefixes; do not substitute `localhost` or the local XAMPP database name unless the panel explicitly says to.
2. In phpMyAdmin, select the newly created database. Import `database/schema.sql` from the project. This schema creates tables in the selected database and deliberately does not attempt `CREATE DATABASE` or `USE`, which may not be permitted for a shared-hosting database user.
3. The schema creates the empty tables `admins`, `profile_settings`, `projects`, `certificates`, `design_items`, `skills`, `experiences`, and `contact_messages`. It contains no administrator, contact messages, or seeded data. `database/seed.sql` is explanatory only; `scripts/seed_content.php` is a local CLI script and is not a host-side setup method.
4. If migrating portfolio content, first create the production schema above, then export **data only** from a reviewed local database for these content tables: `profile_settings`, `projects`, `certificates`, `design_items`, `skills`, and `experiences`. Do not export `admins` or `contact_messages`; that avoids copying test accounts and development contact messages. Review the selected rows before importing. Do not import old schema dumps over the fresh production schema.
5. If exported rows reference uploaded images or documents, transfer only those intended public files into the matching `htdocs/uploads/{projects,certificates,designs,profile,resume}/` folder. Do not copy local configuration, database backups, logs, sessions, cache files, or unrelated uploads.
6. Create `htdocs/config/config.php` through the hosting File Manager. Start from `config/config.example.php` and set:

   ```php
   'app_name' => 'Clyde Nefoti',
   'base_url' => 'https://YOUR-DOMAIN',
   'db_host' => 'HOST-FROM-CONTROL-PANEL',
   'db_name' => 'DATABASE-NAME-FROM-CONTROL-PANEL',
   'db_user' => 'DATABASE-USER-FROM-CONTROL-PANEL',
   'db_pass' => 'DATABASE-PASSWORD-FROM-CONTROL-PANEL',
   'environment' => 'production',
   ```

   Use the site's final HTTPS origin as `base_url`, with no trailing slash and no `/public` suffix. The file is excluded by `.gitignore`; never put production credentials in `public/`, source control, a SQL dump, or a publicly downloadable file.

## Create the first production administrator without a host shell

There is no public registration or web setup script. Create the account directly through phpMyAdmin after importing the schema:

1. On your own Windows computer, use local PHP to generate a `password_hash` value. The password is read with masked PowerShell input and is piped to PHP rather than placed in command history or command arguments:

   ```powershell
   $secure = Read-Host 'New production admin password (12+ characters)' -AsSecureString
   $password = [System.Net.NetworkCredential]::new('', $secure).Password
   $hash = $password | & 'C:\xampp\php\php.exe' -r 'echo password_hash(rtrim(stream_get_contents(STDIN), "\r\n"), PASSWORD_DEFAULT);'
   $password = $null
   $secure.Dispose()
   $secure = $null
   $hash
   ```

   Use a unique password of 12-200 characters, including a letter and a number. Keep the resulting hash private and clear it from the console/clipboard after use.
2. In phpMyAdmin, use **Insert** on the production `admins` table and enter your name, sign-in email, and the generated hash in `password_hash`. Or run an `INSERT` query with those three values; escape any single quote in text values by doubling it.
3. Confirm the row exists, then sign in at `https://YOUR-DOMAIN/admin/login`. No setup script needs to be uploaded or enabled. Do not upload a temporary PHP password generator.

## HTTPS, sessions, uploads, and writable folders

1. Enable/install an HTTPS certificate for the domain through the hosting control panel and wait until HTTPS works without a certificate warning. The exact SSL options depend on the hosting account and domain.
2. Set `base_url` in the private config to the final `https://` origin. The app then marks its session cookie `Secure`, `HttpOnly`, and `SameSite=Lax`; it also enables strict session mode and uses cookie-only sessions.
3. Enable the host's HTTPS redirect option if available. Only add an Apache HTTPS rewrite after confirming the certificate is active and the host's HTTPS/proxy behavior; do not enable a redirect that causes a loop.
4. PHP stores session data at the host's configured `session.save_path`; the app does not put session files under the web root. Confirm sessions are enabled and the host-managed session storage is available. Do not override it to a public directory.
5. Ensure `htdocs/storage/logs/`, `htdocs/storage/cache/`, and all five `htdocs/uploads/` subdirectories exist and are writable by PHP. Use the host's normal directory permission (typically `0755`, or its documented writable setting); do not use world-writable `0777`. Direct web requests to storage remain denied.
6. Upload validation allows image files up to **5 MiB** and PDFs up to **8 MiB**. The hosting PHP `upload_max_filesize` must be at least 8 MiB and `post_max_size` must exceed 8 MiB; shared hosting may impose lower caps. Check the control panel's actual limits. If the account does not permit these limits, the app will report upload errors at the server limit.
7. Uploaded files are stored under `htdocs/uploads/`. The htdocs root rewrite rule blocks requests to script-like extensions under uploads; retain any existing per-directory `.htaccess` protections. Upload directories must not be executable by PHP.

## Deployment tests

After deployment, run these checks in a browser:

1. Visit `https://YOUR-DOMAIN/`. Confirm the home page, stylesheet, JavaScript, and images load without a `/public` path.
2. Visit `/projects`, `/about`, `/contact`, `/sitemap.xml`, and `/robots.txt`. Confirm clean routes reach the MVC router (not a host 404).
3. Visit `/admin/login`, sign in, navigate the dashboard, then sign out. Confirm the session cookie has `Secure`, `HttpOnly`, and `SameSite=Lax` over HTTPS, and that a page refresh preserves the session.
4. Submit a disposable contact-form test and confirm it appears in the admin inbox; delete the test message after verification.
5. As an administrator, test one permitted image upload and one permitted PDF upload with draft/test content, then remove the test content and uploaded files. Also test an unsupported extension and a file over the application limit; these should be rejected.
6. Confirm requests for `/app/`, `/config/config.php`, `/database/schema.sql`, `/scripts/create_admin.php`, `/storage/logs/app.log`, `/docs/INFINITYFREE_DEPLOYMENT.md`, and `/.git/config` return 403/404 and never display source, configuration, logs, or docs. `app`, `config`, and `storage` are inside `htdocs` but are denied by Apache rules; the other paths are not included in the deployment package.
7. Review the site's pages and admin screens for PHP errors, empty media links, database failures, and missing writable-directory warnings. Check the private `storage/logs/` files through the host file manager if a request fails.

## Unresolved account-specific checks

This repository can be prepared locally, but it cannot verify or perform deployment to an InfinityFree account. Before going live, confirm the account actually provides PHP 8.1+, the required extensions, MySQL 5.7+/MariaDB 10.2+, Apache rewrite support, a working HTTPS certificate, the published upload limits, and writable private storage/upload directories. If any check fails, pause deployment and resolve that hosting limitation first.
