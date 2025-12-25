import { useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";

export type NoteRow = {
  id_note: number;
  id_book: number;
  text: string;
  created_at: string;
};

export type CreateNoteInput = {
  id_book: number;
  text: string;
};

export function useNotesRepository() {
  const db = useSQLiteContext();

  return useMemo(() => {
    return {
      async listByBook(id_book: number): Promise<NoteRow[]> {
        return await db.getAllAsync<NoteRow>(
          `SELECT id_note, id_book, text, created_at
           FROM notes
           WHERE id_book = ?
           ORDER BY datetime(created_at) DESC`,
          [id_book],
        );
      },

      async create(input: CreateNoteInput): Promise<number> {
        const res = await db.runAsync(
          `INSERT INTO notes (id_book, text) VALUES (?, ?)`,
          [input.id_book, input.text],
        );
        return Number(res.lastInsertRowId ?? 0);
      },

      async delete(id_note: number): Promise<boolean> {
        const res = await db.runAsync(`DELETE FROM notes WHERE id_note = ?`, [id_note]);
        return Number(res.changes ?? 0) > 0;
      },
    };
  }, [db]);
}
