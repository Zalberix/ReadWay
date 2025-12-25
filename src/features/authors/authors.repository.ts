import { db } from "@/src/db/sqlite.service";

export type AuthorRow = {
  id_author: number;
  full_name: string;
};

export const AuthorsRepository = {
  async list(): Promise<AuthorRow[]> {
    return db.all<AuthorRow>(`SELECT * FROM authors ORDER BY full_name`);
  },

  async search(q: string): Promise<AuthorRow[]> {
    const like = `%${q.trim()}%`;
    return db.all<AuthorRow>(`SELECT * FROM authors WHERE full_name LIKE ? ORDER BY full_name`, [like]);
  },

  async getById(id_author: number): Promise<AuthorRow | null> {
    return db.get<AuthorRow>(`SELECT * FROM authors WHERE id_author = ?`, [id_author]);
  },

  async create(full_name: string): Promise<number> {
    const res = await db.run(`INSERT INTO authors(full_name) VALUES(?)`, [full_name.trim()]);
    return Number(res.lastInsertRowId);
  },

  async update(id_author: number, full_name: string): Promise<void> {
    await db.run(`UPDATE authors SET full_name = ? WHERE id_author = ?`, [full_name.trim(), id_author]);
  },

  async remove(id_author: number): Promise<void> {
    await db.run(`DELETE FROM authors WHERE id_author = ?`, [id_author]);
  },
};
