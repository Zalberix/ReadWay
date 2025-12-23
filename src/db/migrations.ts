import { schemaSql, SCHEMA_VERSION } from "./schema";

export async function runMigrations(db: import("expo-sqlite").SQLiteDatabase) {
  // meta table должна существовать до чтения версии
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = 'schema_version'`
  );

  const current = row?.value ? Number(row.value) : 0;

  if (current === 0) {
    // первая установка
    await db.execAsync(schemaSql);
    await db.runAsync(
      `INSERT OR REPLACE INTO meta(key, value) VALUES('schema_version', ?)`,
      [String(SCHEMA_VERSION)]
    );
    return;
  }

  console.log(current);
  // пример будущих миграций:
  // if (current < 2) { await db.execAsync(`ALTER TABLE ...`); }

  // в конце обновляй версию
  if (current !== SCHEMA_VERSION) {
    await db.runAsync(
      `UPDATE meta SET value = ? WHERE key = 'schema_version'`,
      [String(SCHEMA_VERSION)]
    );
  }
}
