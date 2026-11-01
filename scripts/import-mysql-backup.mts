/**
 * Phase 2C — one-time MySQL (MariaDB 10.4) to Netlify PostgreSQL data importer.
 * =============================================================================
 * Reads the Phase 0 mysqldump backup (outside this repository), parses its
 * schema and data, and loads the rows into the LOCAL Netlify PostgreSQL
 * database (`.netlify/db`) using parameterised SQL inside a single transaction.
 *
 * Guarantees
 *   - The backup file is only ever read; it is never written to.
 *   - Source primary keys are preserved (OVERRIDING SYSTEM VALUE for identity
 *     columns) and the identity sequences are corrected afterwards.
 *   - All values, NULLs, Unicode and escaped newlines are preserved.
 *   - The import refuses to run unless every target table is empty.
 *   - A failure rolls the whole import back, leaving the target unchanged.
 *   - No credentials are embedded; the connection string is minted locally.
 *   - No media files are imported and no administrator account is created.
 *
 * Usage (Node 22):
 *   node --experimental-strip-types scripts/import-mysql-backup.mts <path-to.sql>
 *
 * Environment:
 *   PHASE0_BACKUP_SQL  alternative way to supply the same path.
 *
 * The Phase 0 backup deliberately lives outside this repository, so its location
 * is always supplied explicitly rather than hard-coded to one developer's machine.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NetlifyDB } from "@netlify/database-dev";

/* -------------------------------------------------------------------------- */
/* Expectations                                                               */
/* -------------------------------------------------------------------------- */

const EXPECTED_SHA256 = "F2ABBC91E30C7FBBCE529DB3A736566915B232A19F8FC817A30A9D1EBDB830F5";

/**
 * MySQL DATETIME stores no timezone. The source application ran with
 * date_default_timezone_set('Pacific/Port_Moresby') and never set a MySQL
 * session timezone, so the naive values are Port Moresby wall-clock (UTC+10).
 * Pinning the import session to that zone makes each naive value the correct
 * absolute instant inside the TIMESTAMPTZ columns.
 */
const SOURCE_TIME_ZONE = "Pacific/Port_Moresby";

const EXPECTED_SOURCE_COUNTS: Record<string, number> = {
  admins: 0,
  profile_settings: 1,
  projects: 1,
  certificates: 0,
  design_items: 2,
  skills: 27,
  experiences: 3,
  contact_messages: 0,
};

const AUTH_TABLES = ["admin_sessions", "login_attempts"];

/** Parents before children. No foreign keys exist among the portfolio tables. */
const IMPORT_ORDER = [
  "admins",
  "profile_settings",
  "projects",
  "certificates",
  "design_items",
  "skills",
  "experiences",
  "contact_messages",
];

/** Tables whose id is GENERATED ALWAYS AS IDENTITY (explicit insert required). */
const IDENTITY_TABLES = new Set([
  "admins",
  "projects",
  "certificates",
  "design_items",
  "skills",
  "experiences",
  "contact_messages",
]);

const REQUIRED_MIGRATIONS = [
  "0001_portfolio_schema",
  "0002_auth_support",
  "0003_auth_atomicity",
];
const REPORT_FILENAME = ".tmp-phase2c-import-report.json";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Scalar = string | number | null;
type PgKind = "boolean" | "integer" | "date" | "timestamp" | "text";

interface ColumnSpec {
  name: string;
  mysqlType: string;
  pgKind: PgKind;
}

interface TableSpec {
  name: string;
  columns: ColumnSpec[];
  identity: boolean;
}

/* -------------------------------------------------------------------------- */
/* MySQL dump parsing                                                         */
/* -------------------------------------------------------------------------- */

function pgKindOf(mysqlType: string): PgKind {
  const type = mysqlType.toLowerCase();
  if (type === "tinyint(1)") return "boolean";
  if (type.startsWith("tinyint")) return "integer";
  if (type === "date") return "date";
  if (type === "datetime" || type === "timestamp") return "timestamp";
  if (type.startsWith("int") || type.startsWith("smallint") || type.startsWith("bigint")) return "integer";
  return "text";
}

/** Extracts every CREATE TABLE block, returning its ordered columns. */
function parseSchema(sql: string): Map<string, TableSpec> {
  const specs = new Map<string, TableSpec>();
  const marker = "CREATE TABLE `";
  let cursor = 0;

  for (;;) {
    const start = sql.indexOf(marker, cursor);
    if (start === -1) break;

    const nameStart = start + marker.length;
    const nameEnd = sql.indexOf("`", nameStart);
    const name = sql.slice(nameStart, nameEnd);

    const bodyStart = sql.indexOf("(", nameEnd);
    const bodyEnd = sql.indexOf("\n) ENGINE=", bodyStart);
    if (bodyStart === -1 || bodyEnd === -1) {
      throw new Error(`Malformed CREATE TABLE block for "${name}".`);
    }
    const body = sql.slice(bodyStart + 1, bodyEnd);

    const columns: ColumnSpec[] = [];
    let identity = false;

    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      const match = /^`([^`]+)`\s+([a-zA-Z]+(?:\([^)]*\))?)/.exec(line);
      if (!match) continue;
      if (line.toUpperCase().includes("AUTO_INCREMENT")) identity = true;
      const columnName = match[1] as string;
      const mysqlType = match[2] as string;
      columns.push({ name: columnName, mysqlType, pgKind: pgKindOf(mysqlType) });
    }

    specs.set(name, { name, columns, identity });
    cursor = bodyEnd;
  }

  return specs;
}

const MYSQL_ESCAPES: Record<string, string> = {
  "0": "\0",
  b: "\b",
  n: "\n",
  r: "\r",
  t: "\t",
  Z: "\x1a",
  "'": "'",
  '"': '"',
  "\\": "\\",
};

/** MySQL keeps the backslash for \% and \_ outside of LIKE patterns. */
function unescapeMysql(escaped: string): string {
  if (escaped === "%" || escaped === "_") return `\\${escaped}`;
  return MYSQL_ESCAPES[escaped] ?? escaped;
}

function parseScalar(text: string, start: number): { value: Scalar; next: number } {
  if (text[start] === "'") {
    let out = "";
    let index = start + 1;
    while (index < text.length) {
      const char = text[index] as string;
      if (char === "\\") {
        out += unescapeMysql(text[index + 1] as string);
        index += 2;
        continue;
      }
      if (char === "'") {
        if (text[index + 1] === "'") {
          out += "'";
          index += 2;
          continue;
        }
        index += 1;
        break;
      }
      out += char;
      index += 1;
    }
    return { value: out, next: index };
  }

  if (text.startsWith("NULL", start)) {
    return { value: null, next: start + 4 };
  }

  let index = start;
  while (index < text.length && text[index] !== "," && text[index] !== ")") index += 1;
  const raw = text.slice(start, index).trim();
  const numeric = Number(raw);
  return { value: raw !== "" && Number.isFinite(numeric) ? numeric : raw, next: index };
}

/** Parses the "(...),(...)" tail of an INSERT statement. */
function parseValueList(text: string): Scalar[][] {
  const rows: Scalar[][] = [];
  let index = 0;

  const skipWhitespace = () => {
    while (index < text.length && /\s/.test(text[index] as string)) index += 1;
  };

  while (index < text.length) {
    skipWhitespace();
    if (text[index] !== "(") throw new Error(`Expected "(" at offset ${index}.`);
    index += 1;

    const row: Scalar[] = [];
    for (;;) {
      skipWhitespace();
      if (text[index] === ")") {
        index += 1;
        break;
      }
      const { value, next } = parseScalar(text, index);
      row.push(value);
      index = next;
      skipWhitespace();
      if (text[index] === ",") {
        index += 1;
        continue;
      }
      if (text[index] === ")") {
        index += 1;
        break;
      }
      throw new Error(`Unexpected character "${text[index]}" at offset ${index}.`);
    }

    rows.push(row);
    skipWhitespace();
    if (text[index] === ",") {
      index += 1;
      continue;
    }
    break;
  }

  return rows;
}

function parseInserts(sql: string, specs: Map<string, TableSpec>): Map<string, Scalar[][]> {
  const byTable = new Map<string, Scalar[][]>();

  for (const rawLine of sql.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("INSERT INTO ")) continue;

    const match = /^INSERT INTO `([^`]+)`(?: \(([^)]*)\))? VALUES (.*);$/.exec(line);
    if (!match) throw new Error(`Unparsed INSERT statement: ${line.slice(0, 90)}`);

    const tableName = match[1] as string;
    const spec = specs.get(tableName);
    if (!spec) throw new Error(`INSERT references unknown table "${tableName}".`);

    const explicit = match[2];
    const columns = explicit
      ? explicit.split(",").map((column) => column.trim().replace(/^`|`$/g, ""))
      : spec.columns.map((column) => column.name);
    const expected = spec.columns.map((column) => column.name);
    if (columns.join("|") !== expected.join("|")) {
      throw new Error(
        `Column order mismatch for "${tableName}": dump=[${columns.join(",")}] schema=[${expected.join(",")}]`,
      );
    }

    const parsed = parseValueList(match[3] as string);
    for (const row of parsed) {
      if (row.length !== columns.length) {
        throw new Error(
          `"${tableName}" row has ${row.length} values but ${columns.length} columns are expected.`,
        );
      }
    }

    byTable.set(tableName, [...(byTable.get(tableName) ?? []), ...parsed]);
  }

  return byTable;
}

/** TINYINT(1) is only converted to BOOLEAN after proving the value is 0/1. */
function toPgValue(kind: PgKind, value: Scalar): string | number | boolean | null {
  if (value === null) return null;
  if (kind === "boolean") {
    if (value === 1 || value === "1") return true;
    if (value === 0 || value === "0") return false;
    throw new Error(`TINYINT(1) column holds a non-boolean value: ${JSON.stringify(value)}`);
  }
  return value;
}

/* -------------------------------------------------------------------------- */
/* Canonical serialisation (deterministic source <-> destination comparison)   */
/* -------------------------------------------------------------------------- */

function canonical(kind: PgKind, value: unknown): string {
  if (value === null || value === undefined) return "N";
  if (kind === "boolean") {
    const truthy =
      value === true || value === 1 || value === "1" || value === "t" || value === "true";
    return truthy ? "B1" : "B0";
  }
  const text = String(value);
  return `S${text.length}:${text}`;
}

function rowHash(table: string, kinds: PgKind[], values: unknown[]): string {
  const payload = `${table}\u0000${values.map((v, i) => canonical(kinds[i] as PgKind, v)).join("\u0001")}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/** Destination read-back expression producing a stable textual form. */
function canonicalSelectExpression(column: ColumnSpec): string {
  switch (column.pgKind) {
    case "boolean":
      return `"${column.name}"::text AS "${column.name}"`;
    case "date":
      return `to_char("${column.name}", 'YYYY-MM-DD') AS "${column.name}"`;
    case "timestamp":
      return `to_char("${column.name}" AT TIME ZONE '${SOURCE_TIME_ZONE}', 'YYYY-MM-DD HH24:MI:SS') AS "${column.name}"`;
    case "integer":
      return `"${column.name}"::text AS "${column.name}"`;
    default:
      return `"${column.name}" AS "${column.name}"`;
  }
}

/** PGlite renders BOOLEAN as text; normalise so both sides compare alike. */
function normaliseValue(kind: PgKind, value: unknown): unknown {
  if (kind !== "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function toNumber(value: unknown): number {
  return Number(value);
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

interface ImportReport {
  status: string;
  source?: unknown;
  sourceCounts?: Record<string, number>;
  sourceSchema?: unknown;
  database?: unknown;
  targetCountsBeforeImport?: Record<string, number>;
  appliedMigrations?: string[];
  importSessionTimeZone?: string;
  sequencePlan?: unknown;
  transaction?: string;
  destinationCounts?: Record<string, number>;
  rowComparison?: unknown;
  sequences?: Record<string, unknown>;
  identityProbe?: unknown;
  referentialIntegrity?: unknown;
  mediaImported?: boolean;
  adminAccountCreated?: boolean;
}

async function main(): Promise<void> {
  const report: ImportReport = { status: "started" };
  const sourcePath = process.argv[2] ?? process.env.PHASE0_BACKUP_SQL;

  if (!sourcePath) {
    throw new Error(
      "No source backup supplied. Pass the Phase 0 .sql path as the first argument or set " +
        "PHASE0_BACKUP_SQL, e.g. node --experimental-strip-types " +
        'scripts/import-mysql-backup.mts "<backup-dir>/clyde_portfolio_2026-10-30.sql"',
    );
  }

  if (process.env.NETLIFY_DB_URL) {
    throw new Error(
      "NETLIFY_DB_URL is set, so a local Netlify dev session is already serving the database. " +
        "Stop it before running the importer so the import has exclusive access.",
    );
  }

  if (!existsSync(sourcePath)) {
    throw new Error(`Backup SQL file not found: ${sourcePath}`);
  }

  /* -- 1. Verify the backup identity ------------------------------------- */
  const sourceBytes = await readFile(sourcePath);
  const sha256 = createHash("sha256").update(sourceBytes).digest("hex").toUpperCase();
  report.source = {
    path: sourcePath,
    bytes: sourceBytes.byteLength,
    sha256,
    expectedSha256: EXPECTED_SHA256,
    checksumVerified: sha256 === EXPECTED_SHA256,
  };
  if (sha256 !== EXPECTED_SHA256) {
    throw new Error(`Backup checksum mismatch. expected=${EXPECTED_SHA256} actual=${sha256}`);
  }

  /* -- 2. Parse the source schema and data ------------------------------- */
  const sql = sourceBytes.toString("utf8");
  const specs = parseSchema(sql);
  const sourceRows = parseInserts(sql, specs);

  const sourceCounts: Record<string, number> = {};
  for (const table of IMPORT_ORDER) sourceCounts[table] = (sourceRows.get(table) ?? []).length;
  report.sourceCounts = sourceCounts;

  for (const [table, expected] of Object.entries(EXPECTED_SOURCE_COUNTS)) {
    if (sourceCounts[table] !== expected) {
      throw new Error(
        `Source count mismatch for "${table}": expected ${expected}, parsed ${sourceCounts[table]}.`,
      );
    }
  }

  report.sourceSchema = Object.fromEntries(
    [...specs.entries()].map(([name, spec]) => [
      name,
      {
        identity: spec.identity,
        columns: spec.columns.map((c) => `${c.name} :: ${c.mysqlType} -> ${c.pgKind}`),
      },
    ]),
  );

  /* -- 3. Open the LOCAL Netlify PostgreSQL database --------------------- */
  const dbDirectory = path.join(process.cwd(), ".netlify", "db");
  const db = new NetlifyDB({ directory: dbDirectory, logger: () => undefined });
  const connectionString = await db.start();
  report.database = {
    engine: "Netlify local PostgreSQL (PGlite over TCP)",
    directory: dbDirectory,
    connectionString: connectionString.replace(/\/\/[^@/]*@/, "//***@"),
  };

  try {
    /* -- 4. Pre-import emptiness checks ---------------------------------- */
    const empties: Record<string, number> = {};
    for (const table of [...IMPORT_ORDER, ...AUTH_TABLES]) {
      const { rows } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM public."${table}"`);
      empties[table] = rows[0]?.n ?? -1;
    }
    report.targetCountsBeforeImport = empties;

    const populated = Object.entries(empties).filter(([, n]) => n !== 0);
    if (populated.length > 0) {
      throw new Error(
        `Refusing to import: target tables are not empty -> ${populated
          .map(([table, n]) => `${table}=${n}`)
          .join(", ")}`,
      );
    }

    const applied = await db.query<{ name: string }>("SELECT name FROM netlify.migrations ORDER BY name");
    const appliedNames = applied.rows.map((row) => row.name);
    report.appliedMigrations = appliedNames;
    for (const required of REQUIRED_MIGRATIONS) {
      if (!appliedNames.includes(required)) {
        throw new Error(`Required migration not applied: ${required}`);
      }
    }

    /* -- 5. Transactional import ----------------------------------------- */
    const sequencePlan: { table: string; maxId: number }[] = [];

    await db.exec("BEGIN");
    try {
      await db.query(`SET TIME ZONE '${SOURCE_TIME_ZONE}'`);
      const timeZoneResult = await db.query<{ tz: string }>("SELECT current_setting('TimeZone') AS tz");
      const sessionTimeZone = timeZoneResult.rows[0]?.tz;
      report.importSessionTimeZone = sessionTimeZone;
      if (sessionTimeZone !== SOURCE_TIME_ZONE) {
        throw new Error(`Import session time zone is ${sessionTimeZone}, expected ${SOURCE_TIME_ZONE}.`);
      }

      for (const table of IMPORT_ORDER) {
        const spec = specs.get(table);
        if (!spec) throw new Error(`Missing source schema for "${table}".`);
        const rows = sourceRows.get(table) ?? [];
        if (rows.length === 0) continue;

        const columnList = spec.columns.map((column) => `"${column.name}"`).join(", ");
        const placeholders = spec.columns.map((_, index) => `$${index + 1}`).join(", ");
        const overriding = spec.identity ? " OVERRIDING SYSTEM VALUE" : "";
        const statement = `INSERT INTO public."${table}" (${columnList})${overriding} VALUES (${placeholders})`;

        for (const row of rows) {
          const params = spec.columns.map((column, index) => toPgValue(column.pgKind, row[index] as Scalar));
          await db.query(statement, params);
        }
      }

      /* -- 6. Correct the identity sequences ----------------------------- */
      for (const table of IMPORT_ORDER) {
        if (!IDENTITY_TABLES.has(table)) continue;
        const { rows } = await db.query<{ max_id: number | null; n: number }>(
          `SELECT MAX(id) AS max_id, count(*)::int AS n FROM public."${table}"`,
        );
        const count = rows[0]?.n ?? 0;
        const maxId = toNumber(rows[0]?.max_id ?? 0);
        if (count > 0) {
          await db.query(`SELECT setval(pg_get_serial_sequence($1, 'id')::regclass, $2, true)`, [
            `public.${table}`,
            maxId,
          ]);
          sequencePlan.push({ table, maxId });
        }
      }
      report.sequencePlan = sequencePlan;

      await db.exec("COMMIT");
      report.transaction = "committed";
    } catch (error) {
      await db.exec("ROLLBACK");
      report.transaction = "rolled-back";
      throw error;
    }

    /* -- 7. Post-import row validation ----------------------------------- */
    const destinationCounts: Record<string, number> = {};
    for (const table of [...IMPORT_ORDER, ...AUTH_TABLES]) {
      const { rows } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM public."${table}"`);
      destinationCounts[table] = rows[0]?.n ?? -1;
    }
    report.destinationCounts = destinationCounts;

    const rowComparison: Record<string, unknown> = {};
    for (const table of IMPORT_ORDER) {
      const spec = specs.get(table);
      if (!spec) throw new Error(`Missing source schema for "${table}".`);
      const kinds = spec.columns.map((column) => column.pgKind);
      const sourceList = [...(sourceRows.get(table) ?? [])].sort(
        (a, b) => toNumber(a[0]) - toNumber(b[0]),
      );

      const selectExpression = spec.columns.map(canonicalSelectExpression).join(", ");
      // Order by the underlying +id+ column, not the +"id"::text+ output alias,
      // so the destination is sorted numerically like the source.
      const { rows: destinationRows } = await db.query<Record<string, unknown>>(
        `SELECT ${selectExpression} FROM public."${table}" ORDER BY "${table}"."id"`,
      );

      const sourceHashes = sourceList.map((row) => ({
        id: toNumber(row[0]),
        hash: rowHash(table, kinds, row),
      }));
      const destinationHashes = destinationRows.map((row) => ({
        id: toNumber(row.id),
        hash: rowHash(
          table,
          kinds,
          spec.columns.map((column) => normaliseValue(column.pgKind, row[column.name])),
        ),
      }));

      const mismatches: unknown[] = [];
      let identical = sourceHashes.length === destinationHashes.length;
      if (identical) {
        for (let i = 0; i < sourceHashes.length; i += 1) {
          const source = sourceHashes[i] as { id: number; hash: string };
          const destination = destinationHashes[i] as { id: number; hash: string };
          if (source.id !== destination.id || source.hash !== destination.hash) {
            identical = false;
            mismatches.push({
              position: i,
              sourceId: source.id,
              destinationId: destination.id,
              sourceHash: source.hash,
              destinationHash: destination.hash,
            });
          }
        }
      } else {
        mismatches.push({
          reason: "row-count-differs",
          sourceRows: sourceHashes.length,
          destinationRows: destinationHashes.length,
        });
      }

      rowComparison[table] = {
        sourceRows: sourceHashes.length,
        destinationRows: destinationHashes.length,
        identical,
        sourcePrimaryKeys: sourceHashes.map((row) => row.id),
        destinationPrimaryKeys: destinationHashes.map((row) => row.id),
        sourceRowHashes: sourceHashes,
        destinationRowHashes: destinationHashes,
        mismatches,
      };
    }
    report.rowComparison = rowComparison;

    /* -- 8. Identity sequence verification ------------------------------- */
    const sequences: Record<string, unknown> = {};
    for (const table of IMPORT_ORDER) {
      if (!IDENTITY_TABLES.has(table)) continue;
      const meta = await db.query<{ seq: string | null }>(`SELECT pg_get_serial_sequence($1, 'id') AS seq`, [
        `public.${table}`,
      ]);
      const sequenceName = meta.rows[0]?.seq ?? null;
      const stats = await db.query<{ max_id: number | null; n: number }>(
        `SELECT MAX(id) AS max_id, count(*)::int AS n FROM public."${table}"`,
      );

      let lastValue: number | null = null;
      let isCalled: boolean | null = null;
      if (sequenceName) {
        const state = await db.query<{ last_value: string; is_called: boolean }>(
          `SELECT last_value, is_called FROM ${sequenceName}`,
        );
        lastValue = toNumber(state.rows[0]?.last_value ?? 0);
        isCalled = state.rows[0]?.is_called ?? null;
      }

      const maxId = toNumber(stats.rows[0]?.max_id ?? 0);
      const rowCount = stats.rows[0]?.n ?? 0;
      const nextId = lastValue === null ? null : isCalled ? lastValue + 1 : lastValue;

      sequences[table] = {
        sequence: sequenceName,
        lastValue,
        isCalled,
        maxId,
        rowCount,
        nextId,
        collisionFree: rowCount === 0 ? true : nextId !== null && nextId > maxId,
      };
    }
    report.sequences = sequences;

    /* -- 9. Temporary identity probe (rolled back, then sequence restored) */
    const probeTable = "skills";
    const probeExpectedNextId = toNumber((sequences[probeTable] as { nextId: number }).nextId);
    await db.exec("BEGIN");
    let probeId: number | null = null;
    try {
      const inserted = await db.query<{ id: number }>(
        `INSERT INTO public.skills (name, category, display_order, status)
         VALUES ('__phase2c_sequence_probe__', '__phase2c__', 0, 'draft') RETURNING id`,
      );
      probeId = toNumber(inserted.rows[0]?.id);
    } finally {
      await db.exec("ROLLBACK");
    }
    await db.query(`SELECT setval(pg_get_serial_sequence($1, 'id')::regclass, $2, true)`, [
      `public.${probeTable}`,
      toNumber((sequences[probeTable] as { maxId: number }).maxId),
    ]);
    const afterProbe = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM public."${probeTable}"`,
    );
    report.identityProbe = {
      table: probeTable,
      expectedNextId: probeExpectedNextId,
      generatedId: probeId,
      matchedExpected: probeId === probeExpectedNextId,
      rolledBack: true,
      sequenceRestoredTo: toNumber((sequences[probeTable] as { maxId: number }).maxId),
      rowCountAfterProbe: afterProbe.rows[0]?.n ?? -1,
    };

    /* -- 10. Referential integrity --------------------------------------- */
    const orphanSessions = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM public.admin_sessions s
         LEFT JOIN public.admins a ON a.id = s.admin_id WHERE a.id IS NULL`,
    );
    report.referentialIntegrity = {
      adminSessionsOrphans: orphanSessions.rows[0]?.n ?? -1,
      adminsRowCount: destinationCounts.admins ?? -1,
      adminSessionsRowCount: destinationCounts.admin_sessions ?? -1,
      loginAttemptsRowCount: destinationCounts.login_attempts ?? -1,
    };

    report.mediaImported = false;
    report.adminAccountCreated = false;
    report.status = "completed";
  } finally {
    await db.stop();
  }

  const outPath = path.join(process.cwd(), REPORT_FILENAME);
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  process.stdout.write(`Phase 2C import report written to ${outPath}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Phase 2C import failed: ${message}\n`);
  process.exitCode = 1;
});
