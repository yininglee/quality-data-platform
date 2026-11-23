import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const defaultDatabasePath = resolve(packageRoot, "../../runtime/quality-platform.sqlite");
export const defaultMigrationsDirectory = resolve(packageRoot, "migrations");

export function openDatabase(databasePath = defaultDatabasePath): DatabaseSync {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  return database;
}

export function applyMigrations(
  database: DatabaseSync,
  migrationsDirectory = defaultMigrationsDirectory,
): string[] {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (database.prepare("SELECT version FROM schema_migrations ORDER BY version").all() as Array<{ version: string }>)
      .map(({ version }) => version),
  );
  const pending = readdirSync(migrationsDirectory)
    .filter((fileName) => /^\d+.*\.sql$/.test(fileName))
    .sort()
    .filter((fileName) => !applied.has(fileName));

  for (const fileName of pending) {
    const sql = readFileSync(resolve(migrationsDirectory, fileName), "utf8");
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(sql);
      database.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
        .run(fileName, "2026-08-11T00:00:00.000+08:00");
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  return pending;
}

function isMainModule(): boolean {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  const databasePath = process.env.QUALITY_PLATFORM_DB_PATH ?? defaultDatabasePath;
  const database = openDatabase(databasePath);
  const applied = applyMigrations(database);
  database.close();
  console.log(JSON.stringify({ databasePath, appliedMigrations: applied }, null, 2));
}
