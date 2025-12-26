import { useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";
// import { all, get, run } ... (если у тебя уже есть свои хелперы — используй их)

export type NoteRow = {
  id_note: number;
  id_book: number;
  text: string;
  created_at: string;
};

export function useNotesRepository() {
  const db = useSQLiteContext();

  return useMemo(() => {
    return {
      async listByBook(id_book: number): Promise<NoteRow[]> {
        const rows = await db.getAllAsync<NoteRow>(
          `SELECT * FROM notes WHERE id_book = ? ORDER BY datetime(created_at) DESC, id_note DESC`,
          [id_book],
        );
        return rows ?? [];
      },

      async getById(id_note: number): Promise<NoteRow | null> {
        const row = await db.getFirstAsync<NoteRow>(`SELECT * FROM notes WHERE id_note = ?`, [id_note]);
        return row ?? null;
      },

      async create(input: { id_book: number; text: string }): Promise<number> {
        const createdAt = new Date().toISOString().replace("T", " ").slice(0, 19); // "YYYY-MM-DD HH:MM:SS"
        const res = await db.runAsync(
          `INSERT INTO notes(id_book, text, created_at) VALUES(?, ?, ?)`,
          [input.id_book, input.text, createdAt],
        );
        return Number((res as any).lastInsertRowId ?? 0);
      },

      async update(id_note: number, patch: { text: string }): Promise<void> {
        await db.runAsync(`UPDATE notes SET text = ? WHERE id_note = ?`, [patch.text, id_note]);
      },

      async remove(id_note: number): Promise<void> {
        await db.runAsync(`DELETE FROM notes WHERE id_note = ?`, [id_note]);
      },
    };
  }, [db]);
}
