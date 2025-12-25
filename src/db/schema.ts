export const SCHEMA_VERSION = 1;

export const schemaSql = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS books (
  id_book INTEGER PRIMARY KEY AUTOINCREMENT,
  cover_path TEXT,
  name TEXT NOT NULL,
  description TEXT,
  ISBN TEXT,
  status_read INTEGER,
  page_count INTEGER NOT NULL DEFAULT 0,
  publisher_name TEXT,
  year_of_publication INTEGER,
  month_of_publication INTEGER,
  day_of_publication INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS authors (
  id_author INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS book_authors (
  id_book INTEGER NOT NULL,
  id_author INTEGER NOT NULL,
  PRIMARY KEY (id_book, id_author),
  FOREIGN KEY (id_book) REFERENCES books(id_book) ON DELETE CASCADE,
  FOREIGN KEY (id_author) REFERENCES authors(id_author) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id_note INTEGER PRIMARY KEY AUTOINCREMENT,
  id_book INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_book) REFERENCES books(id_book) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_book INTEGER NOT NULL,
  time INTEGER NOT NULL,
  current_page INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_book) REFERENCES books(id_book) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_book ON notes(id_book, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_book ON sessions(id_book, created_at);

PRAGMA user_version = ${SCHEMA_VERSION};
`;
