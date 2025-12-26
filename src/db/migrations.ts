import { run } from '@/src/db/utils';
import type * as SQLite from "expo-sqlite";
import { schemaSql } from './schema';

export const SCHEMA_VERSION = 2;

export async function runMigrationsIfNeed(db: SQLite.SQLiteDatabase) {
  console.log('runMigrationsIfNeed был запущен');
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  let currentDbVersion = row?.user_version ?? 0;

  if (currentDbVersion >= SCHEMA_VERSION) return;

  if (currentDbVersion === 0) {
    try {
      // Выполняем каждый SQL-запрос по отдельности — безопаснее для разных реализаций SQLite
      const parts = String(schemaSql)
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const p of parts) {
        try {
          // Используем `run` — обёртку, которая вызывает `db.runAsync` и корректно передаёт параметры
          await run(db as any, p + ";");
        } catch (e) {
          console.warn("migration statement failed:", p, e);
        }
      }

      currentDbVersion = SCHEMA_VERSION;
    } catch (err) {
      console.error('Migration apply error', err);
      throw err;
    }
  }

  try {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  } catch (e) {
    // some platforms may require different handling — log and ignore
    console.warn('Failed to set user_version PRAGMA', e);
  }
}
