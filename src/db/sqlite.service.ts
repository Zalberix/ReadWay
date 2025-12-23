import * as SQLite from "expo-sqlite";
import { runMigrations } from "./migrations";

type Row = Record<string, any>;

export class SQLiteService {
  private static instance: SQLiteService | null = null;
  private db!: SQLite.SQLiteDatabase;
  private ready = false;

  private constructor() {}

  static getInstance() {
    if (!this.instance) this.instance = new SQLiteService();
    return this.instance;
  }

  /** Открыть БД и выполнить миграции (вызывать 1 раз при старте приложения) */
  async init(dbName = "app.db") {
    if (this.ready) return;

    this.db = await SQLite.openDatabaseAsync(dbName);

    // на всякий: включаем FK
    await this.db.execAsync(`PRAGMA foreign_keys = ON;`);

    await runMigrations(this.db);
    this.ready = true;
  }

  private assertReady() {
    if (!this.ready) {
      throw new Error("SQLiteService не инициализирован. Вызови await db.init() при старте приложения.");
    }
  }

  async exec(sql: string) {
    this.assertReady();
    await this.db.execAsync(sql);
  }

  async run(sql: string, params: any[] = []) {
    this.assertReady();
    return this.db.runAsync(sql, params);
  }

  async get<T extends Row>(sql: string, params: any[] = []) {
    this.assertReady();
    return this.db.getFirstAsync<T>(sql, params);
  }

  async all<T extends Row>(sql: string, params: any[] = []) {
    this.assertReady();
    return this.db.getAllAsync<T>(sql, params);
  }

  async tx<T>(fn: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    this.assertReady();

    let result!: T;

    await this.db.withTransactionAsync(async () => {
      result = await fn(this.db);
    });

    return result;
  }

}

export const db = SQLiteService.getInstance();
