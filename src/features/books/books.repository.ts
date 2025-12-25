import { useMemo } from "react";
import { useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";

export type BookRow = {
  id_book: number;
  cover_path: string | null;
  name: string;
  description: string | null;
  ISBN: string | null;
  page_count: number;
  publisher_name: string | null;
  year_of_publication: number | null;
  month_of_publication: number | null;
  day_of_publication: number | null;
  created_at: string;
};

export type BooksWithCurrentPage = BookRow & {
  currentPage: number;
}

export type BookWithAuthorsRow = BookRow & {
  authors: string[]; // full_name[]
};

type CreateFullInput = {
  name: string;
  description?: string | null;
  ISBN?: string | null;
  page_count?: number;
  publisher_name?: string | null;
  year_of_publication?: number | null;
  month_of_publication?: number | null;
  day_of_publication?: number | null;
  cover_path?: string | null;
  authors?: string[]; // full_name[]
};

type UpdatePatch = Partial<Omit<BookRow, "id_book" | "created_at">>;

function mapResult<T>(res: any): T[] {
  // expo-sqlite/next возвращает { rows: [...] } или { rows: { _array: [...] } } в зависимости от версии.
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (Array.isArray(res.rows)) return res.rows as T[];
  if (res.rows?._array) return res.rows._array as T[];
  return [];
}

async function all<T>(db: SQLiteDatabase, sql: string, params: any[] = []): Promise<T[]> {
  const res = await db.getAllAsync(sql, params);
  return res as T[];
}

async function get<T>(db: SQLiteDatabase, sql: string, params: any[] = []): Promise<T | null> {
  const row = await db.getFirstAsync<T>(sql, params);
  return row ?? null;
}

async function run(db: SQLiteDatabase, sql: string, params: any[] = []) {
  return db.runAsync(sql, params);
}

// Хук-репозиторий
export function useBooksRepository() {
  const db = useSQLiteContext();

  return useMemo(() => {
    return {
      async list(): Promise<BooksWithCurrentPage[]> {
        return all<BooksWithCurrentPage>(db, `SELECT b.*, COALESCE(
                (
                    SELECT s.current_page
                    FROM sessions s
                    WHERE s.id_book = b.id_book
                    ORDER BY datetime(s.created_at) DESC, s.id DESC
                LIMIT 1
            ),
    0
  ) AS currentPage FROM books b ORDER BY datetime(b.created_at) DESC`);
      },

      async getById(id_book: number): Promise<BookRow | null> {
        return get<BookRow>(db, `SELECT * FROM books WHERE id_book = ?`, [id_book]);
      },

      async getWithAuthors(id_book: number): Promise<BookWithAuthorsRow | null> {
        const book = await get<BookRow>(db, `SELECT * FROM books WHERE id_book = ?`, [id_book]);
        if (!book) return null;

        const authors = await all<{ full_name: string }>(
          db,
          `SELECT a.full_name
             FROM authors a
             JOIN book_authors ba ON ba.id_author = a.id_author
            WHERE ba.id_book = ?
            ORDER BY a.full_name`,
          [id_book]
        );

        return { ...book, authors: authors.map((a) => a.full_name) };
      },

      async createFull(input: CreateFullInput): Promise<number> {
        const createdAt = new Date().toISOString();
        let id_book = 0;

        await db.withTransactionAsync(async () => {
          const res = await run(
            db,
            `INSERT INTO books(
              cover_path, name, description, ISBN, page_count,
              publisher_name, year_of_publication, month_of_publication, day_of_publication, created_at
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              input.cover_path ?? null,
              input.name,
              input.description ?? null,
              input.ISBN ?? null,
              input.page_count ?? 0,
              input.publisher_name ?? null,
              input.year_of_publication ?? null,
              input.month_of_publication ?? null,
              input.day_of_publication ?? null,
              createdAt,
            ]
          );

          id_book = Number((res as any).lastInsertRowId);

          const authors = (input.authors ?? []).map(x => x.trim()).filter(Boolean);

          for (const full_name of authors) {
            await run(
              db,
              `INSERT INTO authors(full_name) VALUES(?) ON CONFLICT(full_name) DO NOTHING`,
              [full_name]
            );

            const a = await get<{ id_author: number }>(
              db,
              `SELECT id_author FROM authors WHERE full_name = ?`,
              [full_name]
            );

            if (a?.id_author) {
              await run(
                db,
                `INSERT OR IGNORE INTO book_authors(id_book, id_author) VALUES(?, ?)`,
                [id_book, a.id_author]
              );
            }
          }
        });

        return id_book;
      },

      async update(id_book: number, patch: UpdatePatch): Promise<void> {
        const fields: string[] = [];
        const params: any[] = [];

        const map: Record<string, any> = {
          cover_path: patch.cover_path,
          name: patch.name,
          description: patch.description,
          ISBN: patch.ISBN,
          page_count: patch.page_count,
          publisher_name: patch.publisher_name,
          year_of_publication: patch.year_of_publication,
          month_of_publication: patch.month_of_publication,
          day_of_publication: patch.day_of_publication,
        };

        for (const [k, v] of Object.entries(map)) {
          if (typeof v === "undefined") continue;
          fields.push(`${k} = ?`);
          params.push(v);
        }

        if (fields.length === 0) return;

        params.push(id_book);

        await run(db, `UPDATE books SET ${fields.join(", ")} WHERE id_book = ?`, params);
        console.log("[db] book updated id_book =", id_book);
      },

      async remove(id_book: number): Promise<void> {
        await run(db, `DELETE FROM books WHERE id_book = ?`, [id_book]);
        console.log("[db] book removed id_book =", id_book);
      },

      async replaceAuthors(id_book: number, authors: string[]): Promise<void> {
        await db.withTransactionAsync(async () => {
          await run(db, `DELETE FROM book_authors WHERE id_book = ?`, [id_book]);

          for (const raw of authors) {
            const full_name = raw.trim();
            if (!full_name) continue;

            await run(
              db,
              `INSERT INTO authors(full_name) VALUES(?) ON CONFLICT(full_name) DO NOTHING`,
              [full_name]
            );

            const a = await get<{ id_author: number }>(
              db,
              `SELECT id_author FROM authors WHERE full_name = ?`,
              [full_name]
            );

            if (a?.id_author) {
              await run(
                db,
                `INSERT OR IGNORE INTO book_authors(id_book, id_author) VALUES(?, ?)`,
                [id_book, a.id_author]
              );
            }
          }
        });

        console.log("[db] authors replaced for book =", id_book);
      },
    };
  }, [db]);
}
