import {type SQLiteDatabase} from "expo-sqlite";

export async function all<T>(db: SQLiteDatabase, sql: string, params: any[] = []): Promise<T[]> {
  const res = await db.getAllAsync(sql, params);
  return res as T[];
}

export async function get<T>(db: SQLiteDatabase, sql: string, params: any[] = []): Promise<T | null> {
  const row = await db.getFirstAsync<T>(sql, params);
  return row ?? null;
}

export async function run(db: SQLiteDatabase, sql: string, params: any[] = []) {
  return db.runAsync(sql, params);
}