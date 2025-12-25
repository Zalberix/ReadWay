import { db } from "@/src/db/sqlite.service";

export type NoteRow = {
  id_note: number;
  id_book: number;
  text: string;
  created_at: string;
};

export const NotesRepository = {
  async listByBook(id_book: number): Promise<NoteRow[]> {
    return db.all<NoteRow>(
      `SELECT * FROM notes WHERE id_book = ? ORDER BY datetime(created_at) DESC`,
      [id_book]
    );
  },

  async getById(id_note: number): Promise<NoteRow | null> {
    return db.get<NoteRow>(`SELECT * FROM notes WHERE id_note = ?`, [id_note]);
  },

  async create(input: { id_book: number; text: string }): Promise<number> {
    const createdAt = new Date().toISOString();
    const res = await db.run(
      `INSERT INTO notes(id_book, text, created_at) VALUES(?, ?, ?)`,
      [input.id_book, input.text, createdAt]
    );
    return Number(res.lastInsertRowId);
  },

  async update(id_note: number, text: string): Promise<void> {
    await db.run(`UPDATE notes SET text = ? WHERE id_note = ?`, [text, id_note]);
  },

  async remove(id_note: number): Promise<void> {
    await db.run(`DELETE FROM notes WHERE id_note = ?`, [id_note]);
  },
};
