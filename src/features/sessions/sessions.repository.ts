import { useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";

export type SessionRow = {
  id: number;
  id_book: number;
  time: number; // seconds
  current_page: number;
  created_at: string;
};

export type CreateSessionInput = {
  id_book: number;
  time: number; // seconds
  current_page: number;
  created_at?: string; // "YYYY-MM-DD HH:MM:SS"
};

export function useSessionsRepository() {
  const db = useSQLiteContext();

  return useMemo(() => {
    return {
      async listByBook(id_book: number, limit = 20): Promise<SessionRow[]> {
        return await db.getAllAsync<SessionRow>(
          `SELECT id, id_book, time, current_page, created_at
           FROM sessions
           WHERE id_book = ?
           ORDER BY datetime(created_at) DESC
               LIMIT ?`,
          [id_book, limit],
        );
      },

      async create(input: CreateSessionInput): Promise<number> {
        if (input.created_at) {
          const res = await db.runAsync(
            `INSERT INTO sessions (id_book, time, current_page, created_at)
             VALUES (?, ?, ?, ?)`,
            [input.id_book, input.time, input.current_page, input.created_at],
          );
          return Number(res.lastInsertRowId ?? 0);
        }

        const res = await db.runAsync(
          `INSERT INTO sessions (id_book, time, current_page) VALUES (?, ?, ?)`,
          [input.id_book, input.time, input.current_page],
        );
        return Number(res.lastInsertRowId ?? 0);
      },

      async delete(id: number): Promise<boolean> {
        const res = await db.runAsync(`DELETE FROM sessions WHERE id = ?`, [id]);
        return Number(res.changes ?? 0) > 0;
      },
    };
  }, [db]);
}
