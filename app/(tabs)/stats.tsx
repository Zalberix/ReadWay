import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { all, get } from "@/src/db/utils";
import { useBooksRepository, type BookRow } from "@/src/features/books/books.repository";
import { useGoalsRepository, type GoalRow } from "@/src/features/goals/goals.repository";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Цвета и переменные (скопированы из goal.tsx для единообразия)
const BG = "#F4F0FF";
const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const TEXT_MUTED = "#7C7790";
const THUMB_BG = "#E9E4F4";

function toSqlDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTimeSeconds(sec: number) {
  if (!sec) return "0 мин.";
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h > 0) return `${h}ч. ${mm}мин.`;
  return `${mm}мин.`;
}

function Calendar({ start, end, onChange }: { start: Date; end: Date; onChange: (s: Date, e: Date) => void }) {
  const [year, setYear] = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth());

  useEffect(() => {
    setYear(start.getFullYear());
    setMonth(start.getMonth());
  }, [start]);

  const firstOfMonth = useMemo(() => new Date(year, month, 1), [year, month]);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // make Monday = 0, Sunday = 6
  const startWeekDay = (firstOfMonth.getDay() + 6) % 7;

  const handlePrev = () => {
    const m = month - 1;
    if (m < 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth(m);
  };
  const handleNext = () => {
    const m = month + 1;
    if (m > 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth(m);
  };

  function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function addDays(d: Date, n: number) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  const onDayPress = (d: number) => {
    const dt = startOfDay(new Date(year, month, d));

    const s = startOfDay(start);
    const e = startOfDay(end);

    // If clicked the left edge of the selection and there is a range,
    // cancel all days up to the right edge and keep only the rightmost day selected.
    if (dt.getTime() === s.getTime() && s.getTime() < e.getTime()) {
      onChange(e, e);
      return;
    }

    // Symmetric: if clicked the right edge of the selection and there is a range,
    // keep only the leftmost day selected.
    if (dt.getTime() === e.getTime() && s.getTime() < e.getTime()) {
      onChange(s, s);
      return;
    }

    // If clicked before current range — expand/move left bound
    if (dt.getTime() < s.getTime()) {
      onChange(dt, e);
      return;
    }

    // If clicked after current range — expand/move right bound
    if (dt.getTime() > e.getTime()) {
      onChange(s, dt);
      return;
    }

    // Clicked inside range (not on edges) -> move right bound to clicked day
    if (dt.getTime() > s.getTime() && dt.getTime() < e.getTime()) {
      onChange(s, dt);
      return;
    }

    // Fallback: select single day
    onChange(dt, dt);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card className="mx-4 mt-4 rounded-2xl bg-white px-4 py-4">
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <Pressable onPress={handlePrev} className="px-3 py-2 rounded-md bg-muted">
            <Text variant="small">‹</Text>
          </Pressable>
          <Text className="text-lg font-semibold" style={{ color: "#111827" }}>{`${firstOfMonth.toLocaleString("ru-RU", { month: "long" })} ${year}`}</Text>
          <Pressable onPress={handleNext} className="px-3 py-2 rounded-md bg-muted">
            <Text variant="small">›</Text>
          </Pressable>
        </View>
      </CardHeader>
      <CardContent>
        <View style={{ flexDirection: "row" }}>
          {"Пн Вт Ср Чт Пт Сб Вс".split(" ").map((x) => (
            <View key={x} style={{ width: `${100 / 7}%` }}>
              <Text className="text-center text-sm" style={{ color: TEXT_MUTED, textAlign: 'center' }}>{x}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cells.map((c, i) => {
            const key = `c-${i}`;
            if (c === null) return <View key={key} style={{ width: `${100 / 7}%`, paddingVertical: 4 }} />;
            const dt = startOfDay(new Date(year, month, c));
            const isSelected = dt.getTime() >= startOfDay(start).getTime() && dt.getTime() <= startOfDay(end).getTime();
            return (
              <View key={key} style={{ width: `${100 / 7}%`, paddingVertical: 4 }}>
                  <Pressable onPress={() => onDayPress(c)} style={{ borderRadius: 12, paddingHorizontal: 4, paddingVertical: 2, minHeight: 28, alignItems: "center", justifyContent: "center", backgroundColor: isSelected ? PURPLE : 'transparent' }}>
                    <Text numberOfLines={1} style={{ color: isSelected ? '#fff' : '#111827', fontSize: 13, lineHeight: 16, textAlign: 'center' }}>{String(c)}</Text>
                  </Pressable>
                </View>
            );
          })}
        </View>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <View className="h-4 w-10 rounded-md" style={{ backgroundColor: PURPLE_SOFT }} />
      <Text className="text-lg font-semibold" style={{ color: "#4B5563" }}>
        {title}
      </Text>
    </View>
  );
}

export default function StatsScreen() {
  const db = useSQLiteContext();
  const booksRepo = useBooksRepository();
  const goalsRepo = useGoalsRepository();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [start, setStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [end, setEnd] = useState<Date>(today);

  const [totalPages, setTotalPages] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [completedBooks, setCompletedBooks] = useState(0);
  const [mostActive, setMostActive] = useState<{ date: string; pages: number } | null>(null);
  const [booksStats, setBooksStats] = useState<{
    book: BookRow;
    pages: number;
    time: number;
    endPage: number;
  }[]>([]);
  const [histPages, setHistPages] = useState<{ label: string; value: number }[]>([]);
  const [histTime, setHistTime] = useState<{ label: string; value: number }[]>([]);
  const [archivedGoals, setArchivedGoals] = useState<Array<GoalRow & { progress?: { done: number; target: number } | null }>>([]);
  const [maxStreakInRange, setMaxStreakInRange] = useState<number>(0);

  const loadStats = useCallback(async () => {
    const startStr = toSqlDate(start);
    const endStr = toSqlDate(end);

    const books = await booksRepo.list();

    let tPages = 0;
    let tTime = 0;
    let tCompleted = 0;

    const perBookStats: typeof booksStats = [];

    for (const b of books) {
      const id = (b as any).id_book as number;

      const lastBefore = await get<{ current_page: number }>(db, `SELECT current_page FROM sessions WHERE id_book = ? AND date(created_at) < ? ORDER BY datetime(created_at) DESC LIMIT 1`, [id, startStr]);
      const lastAtEnd = await get<{ current_page: number }>(db, `SELECT current_page FROM sessions WHERE id_book = ? AND date(created_at) <= ? ORDER BY datetime(created_at) DESC LIMIT 1`, [id, endStr]);

      const pages = Math.max(0, (lastAtEnd?.current_page ?? 0) - (lastBefore?.current_page ?? 0));
      const endPage = Number(lastAtEnd?.current_page ?? 0);

      const sessionsInRange = await all<{ time: number }>(db, `SELECT time FROM sessions WHERE id_book = ? AND date(created_at) BETWEEN ? AND ?`, [id, startStr, endStr]);
      const time = sessionsInRange.reduce((s, r) => s + (r.time ?? 0), 0);

      if ((lastAtEnd?.current_page ?? 0) >= (b.page_count ?? 0) && (b.page_count ?? 0) > 0) tCompleted++;

      if (pages > 0 || time > 0) {
        perBookStats.push({ book: b as BookRow, pages, time, endPage });
      }

      tPages += pages;
      tTime += time;
    }

    // most active day (compute pages per day) and histogram data
    const pagesByDay: { [k: string]: number } = {};
    const timeByDay: { [k: string]: number } = {};
    const dayList: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayStr = toSqlDate(new Date(d));
      pagesByDay[dayStr] = 0;
      timeByDay[dayStr] = 0;
      dayList.push(dayStr);
    }

    // aggregate pages per day by computing delta per book per day
    for (const b of books) {
      const id = (b as any).id_book as number;
      for (const dayStart of dayList) {
        const before = await get<{ current_page: number }>(db, `SELECT current_page FROM sessions WHERE id_book = ? AND date(created_at) < ? ORDER BY datetime(created_at) DESC LIMIT 1`, [id, dayStart]);
        const atDay = await get<{ current_page: number }>(db, `SELECT current_page FROM sessions WHERE id_book = ? AND date(created_at) <= ? ORDER BY datetime(created_at) DESC LIMIT 1`, [id, dayStart]);
        const delta = Math.max(0, (atDay?.current_page ?? 0) - (before?.current_page ?? 0));
        pagesByDay[dayStart] = (pagesByDay[dayStart] ?? 0) + delta;
      }
    }

    // aggregate time per day from sessions
    const sessionsInRangeAll = await all<{ d: string; time: number }>(db, `SELECT date(created_at) as d, SUM(time) as time FROM sessions WHERE date(created_at) BETWEEN ? AND ? GROUP BY date(created_at)`, [startStr, endStr]);
    for (const s of sessionsInRangeAll) {
      const d = (s as any).d as string;
      timeByDay[d] = (timeByDay[d] ?? 0) + (s.time ?? 0);
    }

    let bestDate: string | null = null;
    let bestPages = 0;
    for (const k of dayList) {
      const v = pagesByDay[k] ?? 0;
      if (v > bestPages) {
        bestPages = v;
        bestDate = k;
      }
    }

    const pagesHistArr = dayList.map((d) => ({ label: d.slice(8), value: pagesByDay[d] ?? 0 }));
    const timeHistArr = dayList.map((d) => ({ label: d.slice(8), value: Math.round((timeByDay[d] ?? 0) / 60) })); // minutes

    // archived goals within range: completed_at between OR end_at between
    const goals = await all<any>(db, `SELECT id, type, target, start_at, end_at, created_at, completed_at FROM goals WHERE (date(completed_at) BETWEEN ? AND ?) OR (date(end_at) BETWEEN ? AND ?) ORDER BY datetime(created_at) DESC`, [startStr, endStr, startStr, endStr]);

    const goalsWithProgress: any[] = [];
    for (const g of goals || []) {
      try {
        const prog = await goalsRepo.getProgress(g.id);
        goalsWithProgress.push({ ...g, progress: prog });
      } catch (e) {
        goalsWithProgress.push({ ...g, progress: null });
      }
    }

    // compute max streak within selected period
    const sessionsInRange = await all<{ id: number; id_book: number; current_page: number; created_at: string }>(db, `SELECT id, id_book, current_page, created_at FROM sessions WHERE date(created_at) BETWEEN ? AND ? ORDER BY datetime(created_at) ASC, id ASC`, [startStr, endStr]);
    const byBook2 = new Map<number, typeof sessionsInRange>();
    for (const s of sessionsInRange) {
      const arr = byBook2.get(s.id_book) ?? [];
      arr.push(s);
      byBook2.set(s.id_book, arr as any);
    }

    const readingDates = new Set<string>();
    for (const [, arr] of byBook2.entries()) {
      for (let i = 0; i < arr.length; i++) {
        const cur = arr[i];
        const prev = arr[i - 1];
        const curPage = Number(cur.current_page ?? 0);
        const prevPage = Number(prev?.current_page ?? 0);
        const delta = i === 0 ? curPage : curPage - prevPage;
        if (delta > 0) {
          const d = new Date(String(cur.created_at).replace(" ", "T"));
          if (Number.isNaN(d.getTime())) continue;
          d.setHours(0, 0, 0, 0);
          readingDates.add(toSqlDate(d));
        }
      }
    }

    // compute max consecutive streak in readingDates
    const sortedDates = Array.from(readingDates).sort();
    let bestStreak = 0;
    let run = 0;
    let prevT: number | null = null;
    for (const k of sortedDates) {
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
      if (run > bestStreak) bestStreak = run;
    }

    setTotalPages(tPages);
    setTotalTime(tTime);
    setCompletedBooks(tCompleted);
    setMostActive(bestDate ? { date: bestDate, pages: bestPages } : null);
    setBooksStats(perBookStats);
    setHistPages(pagesHistArr);
    setHistTime(timeHistArr);
    setArchivedGoals(goalsWithProgress ?? []);
    setMaxStreakInRange(bestStreak);
  }, [db, start, end, booksRepo, goalsRepo]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="p-10px"></View>
        <Text className="text-4xl font-semibold" style={{ color: '#111827' }}>Статистика</Text>
        <View className="p-10px"></View>
      </View>

      <Calendar start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />

      <View className="mx-4 mt-4 flex-row gap-3">
        <Card className="flex-1 rounded-2xl bg-white px-4 py-4">
          
          <CardContent>
            <Text variant="large">Всего</Text>
            <Text className="text-2xl font-bold">{totalPages} стр.</Text>
          </CardContent>
        </Card>

        <Card className="flex-1 rounded-2xl bg-white px-4 py-4">
          <CardContent>
            <Text variant="large">Общее время</Text>
            <Text className="text-2xl font-bold">{formatTimeSeconds(totalTime)}</Text>
          </CardContent>
        </Card>
      </View>

      <View className="mx-4 mt-3 flex-row gap-3">
        <Card className="flex-1 rounded-2xl bg-white px-4 py-4">
          <CardContent>
            <Text variant="large">Завершено</Text>
            <Text className="text-2xl font-bold">{completedBooks} книги</Text>
          </CardContent>
        </Card>

        <Card className="flex-1 rounded-2xl bg-white px-4 py-4">
          <CardContent>
            <Text variant="large">Самый активный день</Text>
            <Text className="text-2xl font-bold">{mostActive ? `${mostActive.date} - ${mostActive.pages} стр.` : '-'}</Text>
          </CardContent>
        </Card>
      </View>

      {/* books list moved to bottom */}

      <View className="mx-4 mt-6">
        <Card className="rounded-2xl bg-white px-4 py-4">
          <CardContent>
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold">Гистограмма по страницам</Text>
              <Text className="text-sm" style={{ color: TEXT_MUTED }}>{histPages.length ? `${Math.max(...histPages.map(h => h.value))} стр.` : ''}</Text>
            </View>

            <View style={{ height: 160, marginTop: 12, paddingHorizontal: 6 }}>
              {(() => {
                const max = histPages.length ? Math.max(...histPages.map(h => h.value)) : 0;
                if (!histPages.length || max === 0) return null;
                const h = 120;
                return (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end' }}>
                    {histPages.map((p) => {
                      const height = (p.value / max) * h;
                      return (
                        <View key={p.label} style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
                          <View style={{ width: '70%', height: height, backgroundColor: '#3B82F6', borderRadius: 6 }} />
                          <Text className="text-sm" style={{ color: TEXT_MUTED, marginTop: 6 }}>{p.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </CardContent>
        </Card>

        <Card className="mt-3 rounded-2xl bg-white px-4 py-4">
          <CardContent>
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold">Гистограмма по времени</Text>
              <Text className="text-sm" style={{ color: TEXT_MUTED }}>{histTime.length ? `${Math.max(...histTime.map(h => h.value))} мин.` : ''}</Text>
            </View>

            <View style={{ height: 160, marginTop: 12, paddingHorizontal: 6 }}>
              {(() => {
                const max = histTime.length ? Math.max(...histTime.map(h => h.value)) : 0;
                if (!histTime.length || max === 0) return null;
                const h = 120;
                return (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end' }}>
                    {histTime.map((p) => {
                      const height = (p.value / max) * h;
                      return (
                        <View key={p.label} style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
                          <View style={{ width: '70%', height: height, backgroundColor: '#3B82F6', borderRadius: 6 }} />
                          <Text className="text-sm" style={{ color: TEXT_MUTED, marginTop: 6 }}>{p.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </CardContent>
        </Card>

        {/* Archived goals and streaks */}
        <View className="mt-4">
          <Card className="rounded-2xl bg-white px-4 py-4">
            <CardContent>
                <Text className="font-semibold">Архивные цели за период</Text>
                {archivedGoals.length === 0 ? (
                  <Text className="text-sm mt-2" style={{ color: TEXT_MUTED }}>Нет целей в архиве за выбранный период</Text>
                ) : (
                  archivedGoals.map((g) => (
                    <View key={g.id} className="mt-3">
                      <Text className="font-medium" style={{ color: '#111827' }}>{g.type === 'pages' ? 'Цель (стр.)' : 'Цель (ч.)'} — {g.target}{g.type === 'time' ? ' ч' : ' стр.'}</Text>
                      <Text className="text-sm" style={{ color: TEXT_MUTED }}>Период: {String(g.start_at).slice(0,10)} — {String(g.end_at).slice(0,10)}{g.completed_at ? `, завершена: ${String(g.completed_at).slice(0,10)}` : ''}</Text>
                      <Text className="text-sm mt-1" style={{ color: TEXT_MUTED }}>Прогресс: {g.progress ? (g.type === 'time' ? `${Math.round((g.progress.done ?? 0)/60)} мин.` : `${g.progress.done ?? 0} / ${g.progress.target}`) : '-'}</Text>
                    </View>
                  ))
                )}
              </CardContent>
          </Card>
        </View>

        {/* Streak */}
        <View className="mt-4">
          <Card className="rounded-2xl bg-white px-4 py-4">
            <CardContent>
                <Text className="font-semibold">Максимальный стрик в период</Text>
                <Text className="text-2xl font-bold mt-2">{maxStreakInRange} дней</Text>
              </CardContent>
          </Card>
        </View>

        {/* Books list at bottom */}
        <View className="mt-4">
          <SectionTitle title="Книги (читались в период)" />
          {booksStats.length === 0 ? (
            <Text className="text-sm mt-2" style={{ color: TEXT_MUTED }}>Нет прочитанных книг в выбранный период</Text>
          ) : (
            booksStats.map((b) => (
              <Card key={(b.book as any).id_book} className="mt-3 rounded-2xl bg-white px-4 py-4">
                <CardContent>
                  <Text className="font-semibold" style={{ color: '#111827' }}>{b.book.name}</Text>
                  <Text className="text-sm" style={{ color: TEXT_MUTED }}>{formatTimeSeconds(b.time)} — с. {b.endPage} (+{b.pages})</Text>
                  <View className="mt-3">
                    <View style={{ height: 8, backgroundColor: PURPLE_SOFT, borderRadius: 8, overflow: 'hidden' }}>
                      <View style={{ width: `${b.book.page_count > 0 ? Math.round((b.endPage / b.book.page_count) * 100) : 0}%`, height: '100%', backgroundColor: PURPLE }} />
                    </View>
                    <Text className="text-sm mt-2" style={{ color: TEXT_MUTED }}>с. {b.endPage} / {b.book.page_count} стр.</Text>
                  </View>
                </CardContent>
              </Card>
            ))
          )}
        </View>
      </View>

      <View className="h-24" />
    </ScrollView>
  );
}
