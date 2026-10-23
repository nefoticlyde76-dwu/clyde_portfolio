# InfinityFree deployment

This guide deploys the existing PHP MVC application without server-side Composer, SSH, shell access, or environment variables. Do not treat deployment as complete until the hosting account's PHP version, extensions, MySQL version, database host, HTTPS certificate, and writable-directory behavior have been checked in the control panel.

## Compatibility and included dependencies

- The code requires **PHP 8.1 or newer**. It uses PHP 8.1 `never` return types, PHP 8.0 syntax, and standard PHP functions.
- Required PHP extensions: `pdo_mysql`, `mbstring`, `fileinfo`, and `session`. The app also uses standard PHP core functionality such as `json`, `filter`, `hash`, and `random_bytes`.
- The schema uses InnoDB, `utf8mb4`, `DATETIME` current-timestamp defaults, and standard indexes. Use **MySQL 5.7 or newer** or **MariaDB 10.2 or newer**.
- The repository has no Composer manifest, `vendor/` directory, or third-party PHP packages. There is nothing to install with Composer; upload the application PHP files as-is.
- The hosting account's exact PHP/MySQL versions and extension availability cannot be read from this local checkout. Check the account's PHP selector / PHP information and database panel before deploying. Do not continue if any minimum above is unavailable.
- Apache must allow `.htaccess` and `mod_rewrite`. The included `public/.htaccess` routes non-file requests to `index.php`.

## Exact upload layout

In the hosting account, keep private application files **beside** (not inside) the `htdocs` document root. For example:

```text
account-root/
|-- app/                       # application source; private
|-- config/                    # configuration; private
|   |-- database.php
|   |-- .htaccess
|   `-- config.php             # create for production; never commit
|-- storage/                   # logs and cache; private
|   |-- cache/
|   `-- logs/
`-- htdocs/                    # domain document root
    |-- .htaccess              # upload from project public/.htaccess
    |-- index.php              # upload from project public/index.php
    |-- assets/
    `-- uploads/
        |-- certificates/
        |-- designs/
        |-- profile/
        |-- projects/
        `-- resume/
```

The names `account-root` and `htdocs` are illustrative; use the actual folder shown in the hosting File Manager. The workflow uploads `app/`, `config/database.php`, `config/.htaccess`, and `storage/` beside `htdocs/`, and the contents of the repository's `public/` directory into `htdocs/` (including hidden `.htaccess` files). Create the private `config/config.php` separately through the hosting File Manager. The database schema, migrations, and scripts stay in the repository; they are not part of the deployment package. The front controller expects `app/` at the parent level.

Do **not** upload the entire repository into `htdocs/`. In particular, do not put `app/`, `config/`, `database/`, `scripts/`, `storage/`, `docs/`, the repository-root `.htaccess`, README files, `.git/`, database exports, or local logs in the document root. The root `.htaccess` is for the local XAMPP layout, where the project is under `htdocs/clyde-portfolio/` and URLs include `/public`; it is not needed in the recommended InfinityFree layout. The deployed copy of `public/.htaccess` becomes `htdocs/.htaccess` and should be preserved.

The deployed front controller now uses its own directory for public assets and uploads. `app/`, `config/`, database files, scripts, and logs remain outside the web root; production credentials belong only in the private `config/config.php`.

## Automatic deployment with GitHub Actions

The repository's deployment branch is `main`. The workflow at `.github/workflows/deploy-infinityfree.yml` runs on pushes to `main` and on manual dispatch. It packages the app source beside `htdocs`, places only the contents of `public/` in `htdocs/`, and includes only upload protection files and empty placeholders. It does not package `config/config.php`, `config/config.example.php`, database/schema files, scripts, docs, local uploads, logs, or Git metadata. No Composer packages are needed.

The FTP destination is account-specific: [InfinityFree's FTP guide](https://forum.infinityfree.com/t/how-to-upload-files-with-ftp/49306) documents domain-specific paths such as `/example.com/htdocs`, and its [website migration guide](https://forum.infinityfree.com/t/how-to-migrate-your-website-to-infinityfree/49315) describes uploading website files to `htdocs`. In the repository's **Settings → Secrets and variables → Actions → Variables**, create:

- `FTP_ACCOUNT_DIR`: the exact FTP path to the **parent directory containing this site's `htdocs`**, ending in `/`. For example, use `./` if the FTP account's starting directory contains `htdocs`, or `/example.com/` if the account shows `/example.com/htdocs`. Do not set this to `htdocs/`; the package contains `htdocs/` as a child, with private app directories beside it.
- `FTP_DEPLOY_ENABLED`: set to `true` only after the first dry-run preview is reviewed and the production config file exists on the host.

Create these **repository Actions secrets** in the same page:

- `FTP_SERVER`: the FTP hostname shown in the hosting account's FTP details (InfinityFree's FTP guide lists `ftpupload.net`).
- `FTP_USERNAME`: the hosting account's FTP username.
- `FTP_PASSWORD`: the FTP password from the hosting account/client-area details; never put it in workflow YAML.

The action uses explicit FTPS on port 21 with certificate validation. [InfinityFree forum guidance](https://forum.infinityfree.com/t/how-can-we-use-ssh/79234) states the `ftpupload.net` hostname has the FTP TLS certificate; use the hostname matching the server certificate. SFTP/SSH is not used. The workflow uses the maintained [FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action) release `v4.4.0` and runs a dry-run preview first. Actual uploads stay disabled until `FTP_DEPLOY_ENABLED` is exactly `true`. When enabled, it uploads only the staged app and public files; dangerous clean-slate deletion is disabled. The action's sync state can still remove files it previously deployed when those tracked source files are later removed, but it does not clean the whole hosting directory. Keep production uploads and `config/config.php` out of the staged package.

Before enabling uploads:

1. In InfinityFree's account File Manager, verify the FTP directory for the intended domain and identify the parent of its `htdocs`. Set `FTP_ACCOUNT_DIR` to that exact parent; do not guess based only on the domain name.
2. Create `config/config.php` in the private account directory beside `htdocs` with the production database settings described above. The workflow deliberately preserves this file and never uploads local credentials.
3. Review the current hosting files and make a backup. The workflow does not delete unrelated files, but an existing default index file could take precedence over `index.php`; resolve that deliberately before enabling deploys.
4. Add the three secrets and the `FTP_ACCOUNT_DIR` variable. Run the workflow manually while `FTP_DEPLOY_ENABLED` is unset or not `true`; inspect the dry-run output and confirm it targets the correct domain/account directory.
5. Only after the dry run shows the expected app/source/htdocs layout, set `FTP_DEPLOY_ENABLED` to `true`. Subsequent pushes to `main` then upload automatically. Each run previews its changes before performing the FTP sync.

The workflow does not install server-side dependencies, run migrations, import SQL, transfer database content, or upload administrator/contact data. Provision the production schema, account, and initial administrator separately as described above. Keep local `storage/logs/` and `public/uploads/` media out of source control and out of the deployment package.

## Configure the production database

1. In the hosting control panel, create a MySQL database and user. Copy the exact database host, database name, username, and password shown there. Shared hosts commonly add account prefixes; do not substitute `localhost` or the local XAMPP database name unless the panel explicitly says to.
2. In phpMyAdmin, select the newly created database. Import `database/schema.sql` from the project. This schema creates tables in the selected database and deliberately does not attempt `CREATE DATABASE` or `USE`, which may not be permitted for a shared-hosting database user.
3. The schema creates the empty tables `admins`, `profile_settings`, `projects`, `certificates`, `design_items`, `skills`, `experiences`, and `contact_messages`. It contains no administrator, contact messages, or seeded data. `database/seed.sql` is explanatory only; `scripts/seed_content.php` is a local CLI script and is not a host-side setup method.
4. If migrating portfolio content, first create the production schema above, then export **data only** from a reviewed local database for these content tables: `profile_settings`, `projects`, `certificates`, `design_items`, `skills`, and `experiences`. Do not export `admins` or `contact_messages`; that avoids copying test accounts and development contact messages. Review the selected rows before importing. Do not import old schema dumps over the fresh production schema.
5. If exported rows reference uploaded images or documents, transfer only those intended public files into the matching `htdocs/uploads/{projects,certificates,designs,profile,resume}/` folder. Do not copy local configuration, database backups, logs, sessions, cache files, or unrelated uploads.
6. Create `config/config.php` in the private `account-root/config/` directory. Start from `config/config.example.php` and set:

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
5. Ensure `storage/logs/`, `storage/cache/`, and all five `htdocs/uploads/` subdirectories exist and are writable by PHP. Use the host's normal directory permission (typically `0755`, or its documented writable setting); do not use world-writable `0777`. Keep `storage/` outside `htdocs`.
6. Upload validation allows image files up to **5 MiB** and PDFs up to **8 MiB**. The hosting PHP `upload_max_filesize` must be at least 8 MiB and `post_max_size` must exceed 8 MiB; shared hosting may impose lower caps. Check the control panel's actual limits. If the account does not permit these limits, the app will report upload errors at the server limit.
7. Uploaded files are stored under `htdocs/uploads/`. Existing per-directory `.htaccess` files disable script execution and block script-like extensions; retain them. Upload directories must not be executable by PHP.

## Deployment tests

After deployment, run these checks in a browser:

1. Visit `https://YOUR-DOMAIN/`. Confirm the home page, stylesheet, JavaScript, and images load without a `/public` path.
2. Visit `/projects`, `/about`, `/contact`, `/sitemap.xml`, and `/robots.txt`. Confirm clean routes reach the MVC router (not a host 404).
3. Visit `/admin/login`, sign in, navigate the dashboard, then sign out. Confirm the session cookie has `Secure`, `HttpOnly`, and `SameSite=Lax` over HTTPS, and that a page refresh preserves the session.
4. Submit a disposable contact-form test and confirm it appears in the admin inbox; delete the test message after verification.
5. As an administrator, test one permitted image upload and one permitted PDF upload with draft/test content, then remove the test content and uploaded files. Also test an unsupported extension and a file over the application limit; these should be rejected.
6. Confirm requests for `/app/`, `/config/config.php`, `/database/schema.sql`, `/scripts/create_admin.php`, `/storage/logs/app.log`, `/docs/INFINITYFREE_DEPLOYMENT.md`, and `/.git/config` return 403/404 and never display source, configuration, logs, or docs. With the recommended layout these paths are outside the document root.
7. Review the site's pages and admin screens for PHP errors, empty media links, database failures, and missing writable-directory warnings. Check the private `storage/logs/` files through the host file manager if a request fails.

## Unresolved account-specific checks

This repository can be prepared locally, but it cannot verify or perform deployment to an InfinityFree account. Before going live, confirm the account actually provides PHP 8.1+, the required extensions, MySQL 5.7+/MariaDB 10.2+, Apache rewrite support, a working HTTPS certificate, the published upload limits, and writable private storage/upload directories. If any check fails, pause deployment and resolve that hosting limitation first.
