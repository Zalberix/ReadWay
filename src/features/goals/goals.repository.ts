import { all, get, run } from "@/src/db/utils";
import { useSQLiteContext } from "expo-sqlite";
import { useMemo } from "react";

export type GoalType = "pages" | "time";

export type GoalRow = {
  id: number;
  type: GoalType;
  target: number; // pages or hours
  start_at: string;
  end_at: string;
  created_at: string;
  completed_at?: string | null;
};

export type CreateGoalInput = {
  type: GoalType;
  target: number; // pages or hours
  start_at?: string; // optional, defaults to now
  end_at: string; // required
};

export function useGoalsRepository() {
  const db = useSQLiteContext();

  return useMemo(() => {
    return {
      async create(input: CreateGoalInput): Promise<number> {
        const start = input.start_at ?? null;
        const res: any = await run(
          db,
          `INSERT INTO goals(type, target, start_at, end_at, created_at) VALUES(?, ?, COALESCE(?, datetime('now')), ?, datetime('now'))`,
          [input.type, input.target, start, input.end_at],
        );

        return Number(res?.lastInsertRowId ?? 0);
      },

      async listActive(): Promise<GoalRow[]> {
        return all<GoalRow>(
          db,
          `SELECT id, type, target, start_at, end_at, created_at, completed_at
             FROM goals
            WHERE completed_at IS NULL
              AND datetime(end_at) >= datetime('now')
            ORDER BY datetime(created_at) DESC`
        );
      },

      async listHistory(): Promise<GoalRow[]> {
        return all<GoalRow>(
          db,
          `SELECT id, type, target, start_at, end_at, created_at, completed_at
             FROM goals
            WHERE completed_at IS NOT NULL OR datetime(end_at) < datetime('now')
            ORDER BY datetime(created_at) DESC`
        );
      },

      async complete(id: number, completed_at?: string): Promise<void> {
        await run(db, `UPDATE goals SET completed_at = COALESCE(?, datetime('now')) WHERE id = ?`, [completed_at ?? null, id]);
      },

      async getById(id: number): Promise<GoalRow | null> {
        return get<GoalRow>(db, `SELECT id, type, target, start_at, end_at, created_at, completed_at FROM goals WHERE id = ?`, [id]);
      },

      async update(id: number, patch: Partial<{ type: GoalType; target: number; start_at: string; end_at: string }>): Promise<void> {
        const fields: string[] = [];
        const params: any[] = [];

        if (typeof patch.type !== "undefined") {
          fields.push(`type = ?`);
          params.push(patch.type);
        }
        if (typeof patch.target !== "undefined") {
          fields.push(`target = ?`);
          params.push(patch.target);
        }
        if (typeof patch.start_at !== "undefined") {
          fields.push(`start_at = ?`);
          params.push(patch.start_at);
        }
        if (typeof patch.end_at !== "undefined") {
          fields.push(`end_at = ?`);
          params.push(patch.end_at);
        }

        if (!fields.length) return;

        params.push(id);
        await run(db, `UPDATE goals SET ${fields.join(", ")} WHERE id = ?`, params);
      },

      async remove(id: number): Promise<void> {
        await run(db, `DELETE FROM goals WHERE id = ?`, [id]);
      },

      // Возвращает прогресс в натуральных единицах (pages или seconds)
      async getProgress(id: number): Promise<{ done: number; target: number } | null> {
        const g = await get<GoalRow>(db, `SELECT * FROM goals WHERE id = ?`, [id]);
        if (!g) return null;

        if (g.type === "time") {
          // Суммируем поле time (в секундах) в сессиях в промежутке
          const row = await get<{ ssum: number }>(
            db,
            `SELECT COALESCE(SUM(time), 0) AS ssum FROM sessions WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)`,
            [g.start_at, g.end_at],
          );
          const seconds = Number(row?.ssum ?? 0);
          return { done: seconds, target: g.target * 3600 };
        } else {
          // pages: нужно посчитать дельты по каждой книге между сессиями в периоде
          const rows = await all<{ id: number; id_book: number; current_page: number; created_at: string }>(
            db,
            `SELECT id, id_book, current_page, created_at FROM sessions WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?) ORDER BY datetime(created_at) ASC, id ASC`,
            [g.start_at, g.end_at],
          );

          // сгруппировать по книге и посчитать положительные дельты
          const byBook = new Map<number, Array<{ current_page: number; created_at: string }>>();
          for (const r of rows) {
            const arr = byBook.get(r.id_book) ?? [];
            arr.push({ current_page: Number(r.current_page ?? 0), created_at: r.created_at });
            byBook.set(r.id_book, arr);
          }

          let done = 0;
          for (const [, arr] of byBook.entries()) {
            // arr уже в порядке по времени
            for (let i = 0; i < arr.length; i++) {
              const cur = arr[i];
              const prev = arr[i - 1];
              const curPage = Number(cur.current_page ?? 0);
              const prevPage = Number(prev?.current_page ?? 0);
              const delta = i === 0 ? curPage : curPage - prevPage;
              if (delta > 0) done += delta;
            }
          }

          return { done, target: g.target };
        }
      },
    };
  }, [db]);
}
