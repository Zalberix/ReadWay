// src/features/home/home.repository.ts
import { useCallback } from "react";
import { useSQLiteContext } from "expo-sqlite";

export type HomeLastReadBook = {
  id_book: number;
  name: string;
  cover_path: string | null;
  page_count: number;
  publisher_name: string | null; // fallback, если автора нет
  notes_count: number;
  last_page: number;
  last_session_id: number;
  last_session_at: string;
};

export type HomeRecentBook = {
  id_book: number;
  name: string;
  cover_path: string | null;
  page_count: number;
  publisher_name: string | null;
  last_page: number;
  last_at: string;
};

export type HomeReadingStats = {
  todayPages: number;
  todayHasReading: boolean;
  weekActive: boolean[]; // Mon..Sun
  maxStreak: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDate(sqliteDate: string) {
  const d = new Date(String(sqliteDate).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // Mon=0..Sun=6
  x.setDate(x.getDate() - diff);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

type SessionMini = { id: number; id_book: number; current_page: number; created_at: string };

export function useHomeRepository() {
  const db = useSQLiteContext();

  const getBooksCount = useCallback(async () => {
    const row = await db.getFirstAsync<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM books`);
    return Number(row?.cnt ?? 0);
  }, [db]);

  const getLastReadBook = useCallback(async (): Promise<HomeLastReadBook | null> => {
    const row = await db.getFirstAsync<HomeLastReadBook>(
      `
      SELECT
        b.id_book,
        b.name,
        b.cover_path,
        b.page_count,
        b.publisher_name,
        (SELECT COUNT(*) FROM notes n WHERE n.id_book = b.id_book) AS notes_count,
        s.current_page AS last_page,
        s.id AS last_session_id,
        s.created_at AS last_session_at
      FROM sessions s
      JOIN books b ON b.id_book = s.id_book
      ORDER BY datetime(s.created_at) DESC, s.id DESC
      LIMIT 1
      `,
    );

    return row ?? null;
  }, [db]);

  const listRecentReadBooks = useCallback(
    async (limit = 5): Promise<HomeRecentBook[]> => {
      // Достаём последние чтения по книгам (по последней сессии на книгу)
      const rows = await db.getAllAsync<HomeRecentBook>(
        `
        SELECT
          b.id_book,
          b.name,
          b.cover_path,
          b.page_count,
          b.publisher_name,
          s.current_page AS last_page,
          s.created_at AS last_at
        FROM sessions s
        JOIN (
          SELECT id_book, MAX(datetime(created_at)) AS max_at
          FROM sessions
          GROUP BY id_book
        ) t
          ON t.id_book = s.id_book
         AND datetime(s.created_at) = t.max_at
        JOIN books b ON b.id_book = s.id_book
        ORDER BY datetime(s.created_at) DESC, s.id DESC
        LIMIT ?
        `,
        [limit],
      );

      // На случай одинаковых created_at — дедуп по id_book
      const map = new Map<number, HomeRecentBook>();
      for (const r of rows ?? []) {
        if (!map.has(r.id_book)) map.set(r.id_book, r);
      }
      return Array.from(map.values()).slice(0, limit);
    },
    [db],
  );

  const getDailyGoalPages = useCallback(async (): Promise<number | null> => {
    // Пытаемся прочитать цель из разных возможных мест, без миграций.
    // 1) goals(daily_pages)
    try {
      const row = await db.getFirstAsync<{ daily_pages: number }>(`SELECT daily_pages FROM goals LIMIT 1`);
      const n = Number(row?.daily_pages);
      if (Number.isFinite(n) && n > 0) return n;
    } catch {}

    // 2) settings(key/value)
    try {
      const row = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key IN ('daily_goal_pages','goal_daily_pages') LIMIT 1`,
      );
      const n = Number(row?.value);
      if (Number.isFinite(n) && n > 0) return n;
    } catch {}

    return null;
  }, [db]);

  const getReadingStats = useCallback(async (): Promise<HomeReadingStats> => {
    let sessions: SessionMini[] = [];
    try {
      sessions = (await db.getAllAsync<SessionMini>(
        `SELECT id, id_book, current_page, created_at FROM sessions ORDER BY datetime(created_at) ASC, id ASC`,
      )) as SessionMini[];
    } catch {
      sessions = [];
    }

    // delta как в списке сессий: по каждой книге отдельно, в хронологии
    const byBook = new Map<number, SessionMini[]>();
    for (const s of sessions) {
      const arr = byBook.get(s.id_book) ?? [];
      arr.push(s);
      byBook.set(s.id_book, arr);
    }

    const readingDates = new Set<string>(); // даты где был delta>0
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = dateKeyLocal(today);

    let todayPages = 0;

    for (const [, arr] of byBook.entries()) {
      arr.sort((a, b) => {
        const ta = toDate(a.created_at)?.getTime() ?? 0;
        const tb = toDate(b.created_at)?.getTime() ?? 0;
        if (ta !== tb) return ta - tb;
        return (a.id ?? 0) - (b.id ?? 0);
      });

      for (let i = 0; i < arr.length; i++) {
        const cur = arr[i];
        const prev = arr[i - 1];

        const curPage = Number(cur.current_page ?? 0);
        const prevPage = Number(prev?.current_page ?? 0);
        const delta = i === 0 ? curPage : curPage - prevPage;

        if (delta > 0) {
          const d = toDate(cur.created_at);
          if (!d) continue;
          d.setHours(0, 0, 0, 0);

          const key = dateKeyLocal(d);
          readingDates.add(key);

          if (key === todayKey) todayPages += delta;
        }
      }
    }

    // week Mon..Sun
    const monday = startOfWeekMonday(new Date());
    const weekKeys = Array.from({ length: 7 }, (_, i) => dateKeyLocal(addDays(monday, i)));
    const weekActive = weekKeys.map((k) => readingDates.has(k));

    // max streak по всем датам
    const keys = Array.from(readingDates.values()).sort(); // YYYY-MM-DD сортируется корректно
    let best = 0;
    let run = 0;
    let prevT: number | null = null;

    for (const k of keys) {
      const [yy, mm, dd] = k.split("-").map(Number);
      const d = new Date(yy, (mm ?? 1) - 1, dd ?? 1);
      d.setHours(0, 0, 0, 0);
      const t = d.getTime();

      if (prevT === null) run = 1;
      else {
        const diffDays = Math.round((t - prevT) / 86400000);
        run = diffDays === 1 ? run + 1 : 1;
      }

      prevT = t;
      if (run > best) best = run;
    }

    return {
      todayPages,
      todayHasReading: todayPages > 0,
      weekActive,
      maxStreak: best,
    };
  }, [db]);

  return {
    getBooksCount,
    getLastReadBook,
    listRecentReadBooks,
    getDailyGoalPages,
    getReadingStats,
  };
}
