import { db } from "@/src/db/sqlite.service";

export type BookRow = {
  id: number;
  title: string;
  total_pages: number;
  current_page: number;
  cover_uri: string | null;
  created_at: string;
};

export const BooksRepository = {
  async list(): Promise<BookRow[]> {
    return db.all<BookRow>(
      `SELECT * FROM books ORDER BY datetime(created_at) DESC`
    );
  },

  async getById(id: number): Promise<BookRow | null> {
    const row = await db.get<BookRow>(`SELECT * FROM books WHERE id = ?`, [id]);
    return row ?? null;
  },

  async create(input: { title: string; totalPages?: number; coverUri?: string | null }) {
    const createdAt = new Date().toISOString();
    const total = input.totalPages ?? 0;

    const res = await db.run(
      `INSERT INTO books(title, total_pages, current_page, cover_uri, created_at)
       VALUES(?, ?, 0, ?, ?)`,
      [input.title, total, input.coverUri ?? null, createdAt]
    );

    return res.lastInsertRowId; // number
  },

  async updateProgress(id: number, currentPage: number) {
    await db.run(
      `UPDATE books SET current_page = ? WHERE id = ?`,
      [currentPage, id]
    );
  },

  async remove(id: number) {
    await db.run(`DELETE FROM books WHERE id = ?`, [id]);
  },
};
