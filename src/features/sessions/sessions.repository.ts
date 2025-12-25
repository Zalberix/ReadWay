import { db } from "@/src/db/sqlite.service";

export type SessionRow = {
  id: number;
  id_book: number;
  time: number;
  current_page: number;
  created_at: string;
};

export const SessionsRepository = {
  async listByBook(id_book: number): Promise<SessionRow[]> {
    return db.all<SessionRow>(
      `SELECT * FROM sessions WHERE id_book = ? ORDER BY datetime(created_at) DESC`,
      [id_book]
    );
  },

  async getById(id: number): Promise<SessionRow | null> {
    return db.get<SessionRow>(`SELECT * FROM sessions WHERE id = ?`, [id]);
  },

  async create(input: { id_book: number; time: number; current_page: number }): Promise<number> {
    const createdAt = new Date().toISOString();
    const res = await db.run(
      `INSERT INTO sessions(id_book, time, current_page, created_at) VALUES(?, ?, ?, ?)`,
      [input.id_book, input.time, input.current_page, createdAt]
    );
    return Number(res.lastInsertRowId);
  },

  async update(id: number, patch: Partial<Pick<SessionRow, "time" | "current_page">>): Promise<void> {
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

    if (!fields.length) return;
    params.push(id);

    await db.run(`UPDATE sessions SET ${fields.join(", ")} WHERE id = ?`, params);
  },

  async remove(id: number): Promise<void> {
    await db.run(`DELETE FROM sessions WHERE id = ?`, [id]);
  },
};
