import { useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";

import { all, get, run } from "@/src/db/utils";

export type SessionRow = {
  id: number;
  id_book: number;
  time: number; // seconds
  current_page: number;
  created_at: string; // "YYYY-MM-DD HH:MM:SS"
};

export type CreateSessionInput = {
  id_book: number;
  time: number; // seconds
  current_page: number;
  created_at?: string; // optional "YYYY-MM-DD HH:MM:SS"
};

export type UpdateSessionPatch = Partial<Pick<CreateSessionInput, "time" | "current_page" | "created_at">>;

export function useSessionsRepository() {
  const db = useSQLiteContext();

  return useMemo(() => {
    return {
      async listByBook(id_book: number, limit?: number): Promise<SessionRow[]> {
        const lim = typeof limit === "number" && limit > 0 ? limit : 999999;
        return all<SessionRow>(
          db,
          `SELECT id, id_book, time, current_page, created_at
             FROM sessions
            WHERE id_book = ?
            ORDER BY datetime(created_at) DESC, id DESC
            LIMIT ?`,
          [id_book, lim],
        );
      },

      async getById(id: number): Promise<SessionRow | null> {
        return get<SessionRow>(
          db,
          `SELECT id, id_book, time, current_page, created_at
             FROM sessions
            WHERE id = ?`,
          [id],
        );
      },

      async create(input: CreateSessionInput): Promise<number> {
        const res = await run(
          db,
          `INSERT INTO sessions(id_book, time, current_page, created_at)
           VALUES(?, ?, ?, COALESCE(?, datetime('now')))`,
          [input.id_book, input.time, input.current_page, input.created_at ?? null],
        );

        return Number((res as any)?.lastInsertRowId ?? 0);
      },

      async update(id: number, patch: UpdateSessionPatch): Promise<void> {
        const fields: string[] = [];
        const params: any[] = [];

        if (typeof patch.time !== "undefined") {
          fields.push(`time = ?`);
          params.push(patch.time);
        }
        if (typeof patch.current_page !== "undefined") {
          fields.push(`current_page = ?`);
          params.push(patch.current_page);
        }
        if (typeof patch.created_at !== "undefined") {
          fields.push(`created_at = COALESCE(?, created_at)`);
          params.push(patch.created_at);
        }

        if (!fields.length) return;

        params.push(id);
        await run(db, `UPDATE sessions SET ${fields.join(", ")} WHERE id = ?`, params);
      },

      async remove(id: number): Promise<void> {
        await run(db, `DELETE FROM sessions WHERE id = ?`, [id]);
      },
    };
  }, [db]);
}
