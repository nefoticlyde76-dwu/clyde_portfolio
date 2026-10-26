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

4. Load the CV-backed starting content. The script inserts missing records and does not replace text you later edit in the dashboard. It only aligns earlier seed text when the existing row still matches its original content:

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

Published rows come from the supplied professional CV:

- Profile summary, headline, biography, and Madang location
- The TeleHealth PNG capstone, including its live site and documented features
- Web and database skills, tools and platforms, systems analysis, coursework exposure, design, and professional skills
- Independent graphic design, student association leadership, and the Divine Word University degree

Left empty or unpublished:

- Certificates, because none are listed on the CV
- NCRA, until you supply accurate details
- Public email, phone, LinkedIn, GitHub, resume, and profile image, because the CV still has placeholders
- TeleHealth source code, because the CV records Git and GitHub for version control but no repository address. The live site is the CV link `https://mbphatelehealth.com`
- The WPU Enterprise Information System and ICT Services helpdesk placement, because they are not listed in this CV; matching original seed records are retained as drafts
- Lodestar Studio and the tableware logo contest, saved as drafts without images

Run `scripts\seed_content.php` again to add any missing CV-backed rows or draft design samples. It will not overwrite a row you have edited, and it will not add certificates or NCRA. Contact details and social links remain empty because the CV contains placeholders for them.

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
