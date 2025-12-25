import type * as SQLite from "expo-sqlite";
import {schemaSql} from './schema';

export const SCHEMA_VERSION = 1;

export async function runMigrationsIfNeed(db: SQLite.SQLiteDatabase) {
  console.log('runMigrationsIfNeed был запущен');
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  let currentDbVersion = row?.user_version ?? 0;

  if (currentDbVersion >= SCHEMA_VERSION) return;

  if (currentDbVersion === 0) {
    await db.execAsync(schemaSql);
    currentDbVersion = SCHEMA_VERSION;
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
