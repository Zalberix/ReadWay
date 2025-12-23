export const SCHEMA_VERSION = 1;

export const schemaSql = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  total_pages INTEGER NOT NULL DEFAULT 0,
  current_page INTEGER NOT NULL DEFAULT 0,
  cover_uri TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at);
`;
