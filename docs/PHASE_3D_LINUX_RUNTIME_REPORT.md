# Phase 3D — Linux Argon2 Runtime and Netlify Function Packaging Report

## Executive summary

The Windows/Node.js regression checks and the installed Netlify CLI function build passed. They do **not** establish Linux compatibility: Docker is unavailable and WSL2 has no installed Linux distribution, so the Linux Argon2 runtime and Linux function-package checks could not be run. The Linux x64 GNU package is listed in the existing lockfile but is not installed in this Windows environment.

No dependency version was changed. No production or managed database was accessed, no permanent administrator was created, and no commit, push, or deployment was performed.

## Results at a glance

| Check | Result | Evidence |
|---|---|---|
| Docker/WSL Linux environment | **Blocked** | Docker is unavailable; WSL2 has no installed distribution. |
| Node.js 22 Windows regression | **Passed** | Node.js v22.23.4; `npm run typecheck` and all 18 auth tests passed. |
| Argon2 package version | **Passed** | `@node-rs/argon2` 2.2.2, matching the existing lockfile. |
| Argon2 Linux x64 GNU execution | **Unverified** | Linux package is locked but absent from Windows `node_modules`; no Linux runtime was available. |
| Netlify Functions build | **Passed on Windows only** | Installed CLI built all five configured function archives. |
| Linux function packaging and packaged execution | **Unverified** | Windows archives contain Windows-specific native binaries; no Linux build or execution was possible. |
| Managed PostgreSQL validation | **Unverified / outstanding** | No managed or production database was created or accessed. |
| Git safety | **Passed** | Branch and HEAD checked; no changes staged, committed, pushed, or deployed; existing `.htaccess` deletion preserved. |

## 1. Environment and package versions

- Repository branch: `migration/netlify`
- HEAD: `597f80c408ad1138f952354e4f8169952a808078`
- `main` resolved to the same baseline commit; no branch switch or `main` modification was made.
- Host: Windows x64.
- Node.js used for validation: v22.23.4.
- npm: 11.9.0.
- Installed `@node-rs/argon2`: 2.2.2.
- Docker CLI was unavailable and Docker Desktop was not registered as a service.
- WSL reports default version 2, but `wsl --list --verbose` reports that no Linux distributions are installed.

No Docker or WSL installation, enablement, or distribution setup was attempted.

## 2. Argon2 Linux native package

The lockfile contains the optional `@node-rs/argon2-linux-x64-gnu` package at version 2.2.2. After `npm ci` on Windows, only `@node-rs/argon2-win32-x64-msvc` was installed under `node_modules`; the Linux GNU package directory and binary are absent. This is expected platform-specific installation behavior and is not evidence that the Linux binary loads.

The project continues to use the existing Argon2 package and version. No upgrade or dependency-manifest change was made. The password API was exercised by the Windows authentication test suite, but the Linux native module was not imported, hashed with, or verified.

### Password test results

- **Passed (Windows):** The suite's Argon2id hash/verify case passed, including successful verification of the correct password and rejection of an incorrect password.
- **Unverified (Linux):** Node.js 22 Linux x64 GNU import, native binary resolution, hash, and verification.

## 3. Netlify Functions packaging

The installed CLI help documents `netlify functions:build` with `--src` and `--functions` options. The command used was:

```text
netlify functions:build --src netlify/functions --functions .netlify/functions-build
```

It completed successfully on Windows and produced five archives:

| Function | ZIP size | Expanded size | Native binary in archive |
|---|---:|---:|---|
| `admin-auth-login` | 881,142 bytes | 2,487,126 bytes | Windows x64 MSVC |
| `admin-auth-logout` | 597,521 bytes | 1,834,321 bytes | None |
| `admin-auth-me` | 596,455 bytes | 1,830,207 bytes | None |
| `admin-setup` | 880,656 bytes | 2,485,756 bytes | Windows x64 MSVC |
| `health` | 337,707 bytes | 1,130,730 bytes | None |

The login and setup archives each contain `argon2.win32-x64-msvc.node` (609,280 bytes). No `.env`, private-key, certificate, or similar secret file was present in the archives. The small Windows-produced archive sizes are not a Linux packaging result and do not prove that the correct Linux binary will be retained or load in Netlify.

- **Passed:** The installed CLI builds all five function artifacts on Windows.
- **Unverified:** Linux-produced function bundles, Linux native-module inclusion/resolution, packaged function execution on Linux, and the absence of a Windows binary from a Linux package.
- **Unverified:** Netlify deployment/runtime limits in the target environment; local archive sizes alone do not validate deployment behavior.

## 4. Authentication regression tests

After `npm ci`, the following passed:

- `npm run typecheck`
- `npm run test:auth` — 18 tests passed, 0 failed.

The authentication suite exercises password hashing and verification, login, session validation, logout, CSRF/cookie behavior, setup protection, and rate-limit behavior using the test suite's isolated adapter. Its output also confirms the adapter leaves no authentication records. This is Windows test evidence, not execution of the packaged functions in Linux. No administrator was created in the persistent project database.

## 5. Build and dependency-install results

- `npm ci` completed successfully from the existing lockfile.
- `npm run build` completed successfully, including the Netlify static build and typecheck.
- `netlify functions:build` completed successfully on Windows.
- The lockfile and dependency versions were not intentionally changed during this phase.
- npm reported 39 audit findings during installation (4 low, 14 moderate, 20 high, 1 critical). No automatic audit fix or package update was run; this report does not assess or remediate those dependency findings.

## 6. Database and managed-runtime status

No persistent local portfolio database, managed database, or production database was used by these validation commands. The authentication suite used its disposable isolated test adapter; no persistent database was mutated, no test administrator was inserted into the project database, and no production credentials were supplied.

Managed PostgreSQL behavior remains unverified. A future validation should use a Netlify deploy preview or equivalent isolated non-production environment, with disposable credentials and data. Production database access must remain prohibited until an explicitly authorized cutover phase.

## 7. Remaining blockers and required follow-up

Before asserting Linux compatibility or treating this as deployment-ready:

1. Provide an already available, isolated Linux x64 GNU environment with Node.js 22; do not infer compatibility from this Windows run.
2. Install from the existing lockfile in that environment and verify the actual Linux Argon2 native package resolves.
3. Run password hash/verify tests there, including rejection of an incorrect password.
4. Build the Netlify Functions under Linux and inspect the resulting archives for the Linux GNU binary and absence of Windows native binaries.
5. Execute the packaged authentication functions in Linux against a disposable isolated database, then remove all disposable test state.
6. Complete managed PostgreSQL validation using a non-production deploy-preview environment before any production cutover.

These Linux and managed-database checks are **unverified**, not passed. No change to Netlify bundling configuration is justified by the Windows-only evidence.

## 8. Git state and scope

The working branch remained `migration/netlify` at the expected baseline HEAD. No files were staged, committed, pushed, or deployed. The pre-existing unstaged `.htaccess` deletion was preserved. The worktree already contained other unstaged and untracked migration work; it was not reverted or staged. This report is the only file added for Phase 3D.

`git diff --check` completed without errors. No production secrets were introduced, and no changes were made to the authentication dependencies, static login interface, API route rewrites, or function configuration during this phase.

## Phase 3D.1 — Hosted Linux validation workflow

### Status: prepared, not yet executed

The workflow [verify-linux-auth.yml](../.github/workflows/verify-linux-auth.yml) has been added on `migration/netlify`. It uses a GitHub-hosted `ubuntu-latest` runner, sets up Node.js 22, and installs from the existing lockfile with `npm ci --include=optional`. It neither reads secrets nor configures a deploy action.

The workflow is configured to run on pushes to `migration/netlify` and supports `workflow_dispatch`. It has read-only `contents` permission and does not change the existing InfinityFree deployment workflow.

During publication-plan review, a duplicate `process.exitCode = 1` assignment in the packaged-function verification step was found and removed; the remaining assignment preserves non-zero failure propagation. The full workflow was reviewed for runner, Node version, locked dependency installation, Linux Argon2 checks, required regression/build steps, permissions, and deployment/database access. Local YAML 1.2 parsing and structural checks passed. These checks do not execute the workflow or validate Linux runtime behavior.

When run, it will:

- Assert the runner is Linux x64 and report the Node version.
- Resolve and version-check `@node-rs/argon2-linux-x64-gnu` 2.2.2, assert the Windows native binary is absent, and report the native `.node` path.
- Import `netlify/lib/auth/password.mts`, hash a random disposable password, verify the correct password, and reject a wrong password without printing credentials or hashes.
- Run `npm run typecheck`, `npm run test:auth`, and `npm run build`.
- Read the installed project-local Netlify CLI build help and build the five Netlify Functions.
- Check the expected function archives, assert login/setup contain the Linux GNU binary and no archive contains the Windows native binary, reject common secret-file names, then extract the login function to the runner's temporary directory and import/hash/verify with Argon2 from that packaged function.

The workflow has **not** been run: it is not pushed to GitHub, and this phase prohibits pushing or triggering it locally. Therefore all hosted Linux test results, including the native module resolution path and Linux archive composition, remain **pending/unverified**. The previously reported Windows test and bundle results remain historical evidence only.

After the workflow correction, local `npm run typecheck`, `npm run test:auth` (18 tests), and `npm run build` passed on Windows. The workflow's Linux-native assertions and Ubuntu function packaging remain pending a hosted GitHub Actions run.

This workflow validates the Linux native module and Linux-built function package; it does not deploy a function or establish behavior in an actual deployed Netlify runtime. Managed PostgreSQL testing and any deployed-runtime validation remain separate future work requiring an explicitly isolated non-production environment.

### Execution requirements and safety state

- The push-triggered run requires this workflow to be pushed to `migration/netlify`; no commit or push was made here.
- `workflow_dispatch` is configured, but GitHub exposes manual dispatch only when the workflow is available on the repository's default branch. Since `main` must not be modified, manual dispatch may require a separately approved way to make the workflow available there. Do not change `main` as part of this phase.
- No local Windows attempt was made to simulate or trigger the hosted workflow.
- No production/managed PostgreSQL was accessed, no real administrator was provisioned, and no imported portfolio data was modified.
- The pre-existing `.htaccess` deletion remains unstaged. Nothing was staged, committed, pushed, or deployed.
- The workflow's `.netlify` build output and extracted test package are generated only during the hosted job; the extracted package is under the runner temporary directory.
