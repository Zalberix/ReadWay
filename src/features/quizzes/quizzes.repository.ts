import { all, run } from "@/src/db/utils";
import { useSQLiteContext } from "expo-sqlite";
import { useMemo } from "react";

export type QuizResultRow = {
  id: number;
  id_book: number;
  title: string;
  score: number;
  total: number;
  answers_json: string;
  created_at: string;
};

export function useQuizzesRepository() {
  const db = useSQLiteContext();

  return useMemo(() => {
    // Ensure table exists
    (async () => {
      try {
        await run(db, `
          CREATE TABLE IF NOT EXISTS quiz_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_book INTEGER NOT NULL,
            title TEXT NOT NULL,
            score INTEGER NOT NULL,
            total INTEGER NOT NULL,
            answers_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `, []);
      } catch (e) {
        // ignore
      }
    })();

    return {
      async listByBook(id_book: number, limit?: number): Promise<QuizResultRow[]> {
        const lim = typeof limit === 'number' && limit > 0 ? limit : 999999;
        const rows = await all<QuizResultRow>(
          db,
          `SELECT id, id_book, title, score, total, answers_json, created_at
             FROM quiz_results
            WHERE id_book = ?
            ORDER BY datetime(created_at) DESC, id DESC
            LIMIT ?`,
          [id_book, lim],
        );
        return rows;
      },

      async saveResult(input: { id_book: number; title: string; score: number; total: number; answers: any[] }): Promise<number> {
        const res: any = await run(
          db,
          `INSERT INTO quiz_results(id_book, title, score, total, answers_json, created_at) VALUES(?, ?, ?, ?, ?, datetime('now'))`,
          [input.id_book, input.title, input.score, input.total, JSON.stringify(input.answers)]
        );
        return Number(res?.lastInsertRowId ?? 0);
      },
    };
  }, [db]);
}
