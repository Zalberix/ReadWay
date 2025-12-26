// app/(tabs)/index.tsx
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import "../../global.css";

import PlaceholderIcon from "@/assets/icons/book-placeholder.svg";
import ChevronRightIcon from "@/assets/icons/chevron-right.svg";
import FireIcon from "@/assets/icons/fire.svg";
import PencilIcon from "@/assets/icons/pencil.svg";
import PlayIcon from "@/assets/icons/play.svg";
import PlusIcon from "@/assets/icons/plus.svg";
import StreakFireIcon from "@/assets/icons/streak-fire.svg";

import { useGoalsRepository, type GoalRow } from "@/src/features/goals/goals.repository";
import {
    useHomeRepository,
    type HomeLastReadBook,
    type HomeReadingStats,
    type HomeRecentBook,
} from "@/src/features/home/home.repository";

const BG = "#F4F0FF";
const PURPLE = "#8B5CF6";
const PURPLE_SOFT = "#E9D5FF";
const TEXT_MUTED = "#7C7790";
const THUMB_BG = "#E9E4F4";

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function BookThumb({ uri, size = 56 }: { uri?: string | null; size?: number }) {
  const s = size ?? 56;
  const hasImage = typeof uri === "string" && uri.trim().length > 0;

  return (
    <View className="overflow-hidden rounded-xl" style={{ width: s, height: s, backgroundColor: THUMB_BG }}>
      {hasImage ? (
        <Image source={{ uri: uri! }} style={{ width: s, height: s }} resizeMode="cover" />
      ) : (
        <PlaceholderIcon width={s} height={s} />
      )}
    </View>
  );
}

function CircleProgress({
                          value,
                          size = 56,
                          strokeWidth = 6,
                          centerText,
                        }: {
  value: number; // 0..1
  size?: number;
  strokeWidth?: number;
  centerText?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const v = clamp01(value);
  const dash = c * (1 - v);

  return (
    <View className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={PURPLE_SOFT} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={PURPLE}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dash}
          strokeLinecap="round"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>

      <View className="absolute items-center justify-center">
        <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
          {centerText ?? `${Math.round(v * 100)}%`}
        </Text>
      </View>
    </View>
  );
}


function DayDot({ label, active }: { label: string; active: boolean }) {
  return (
    <View className="items-center gap-1">
      {active ? (
        <View className="h-6 w-6 items-center justify-center">
          <StreakFireIcon width={32} height={32} />
        </View>
      ) : (
        <View
          className="h-6 w-6 rounded-full border-2"
          style={{
            borderColor: "#6B677A",
            backgroundColor: "transparent",
          }}
        />
      )}

      <Text className="text-xs" style={{ color: "#6B677A" }}>
        {label}
      </Text>
    </View>
  );
}


export default function HomeScreen() {
  const homeRepo = useHomeRepository();
  const goalsRepo = useGoalsRepository();

  const [booksCount, setBooksCount] = useState(0);
  const [lastRead, setLastRead] = useState<HomeLastReadBook | null>(null);
  const [recentBooks, setRecentBooks] = useState<HomeRecentBook[]>([]);
  const [goalPages, setGoalPages] = useState<number | null>(null);
  const [stats, setStats] = useState<HomeReadingStats>({
    todayPages: 0,
    todayHasReading: false,
    weekActive: [false, false, false, false, false, false, false],
    maxStreak: 0,
  });

  const [lastActiveGoal, setLastActiveGoal] = useState<GoalRow | null>(null);
  const [lastActiveProgress, setLastActiveProgress] = useState<{ done: number; target: number } | null>(null);

  const load = useCallback(async () => {
    const [cnt, last, recent, goal, st] = await Promise.all([
      homeRepo.getBooksCount(),
      homeRepo.getLastReadBook(),
      homeRepo.listRecentReadBooks(5),
      homeRepo.getDailyGoalPages(),
      homeRepo.getReadingStats(),
    ]);

    setBooksCount(cnt);
    setLastRead(last);
    setRecentBooks(recent);
    setGoalPages(goal);
    setStats(st);

    try {
      const active = await goalsRepo.listActive();
      const g = active?.[0] ?? null;
      setLastActiveGoal(g);
      if (g) {
        const p = await goalsRepo.getProgress(g.id);
        setLastActiveProgress(p);
      } else setLastActiveProgress(null);
    } catch (e) {
      setLastActiveGoal(null);
      setLastActiveProgress(null);
    }
  }, [homeRepo, goalsRepo]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const goToCreateBooks = useCallback(() => router.push("/book-create"), []);
  const goToBooks = useCallback(() => router.replace({ pathname: "/books", params: { returnTo: "/" } }), []);
  const goToGoal = useCallback(() => {
    // модалка должна быть настроена на уровне роутов; тут просто push
    router.push({ pathname: "/goal", params: { returnTo: "/" } });
  }, []);

  const openBook = useCallback((id_book: number) => {
    router.push({ pathname: "/book", params: { id_book: String(id_book) } });
  }, []);

  const openEditLastSession = useCallback((sessionId: number, bookId: number, maxPages: number) => {
    router.push({
      pathname: "/session-edit",
      params: { id: String(sessionId), id_book: String(bookId), max: String(maxPages) },
    });
  }, []);

  const openCreateNote = useCallback((bookId: number) => {
    router.push({ pathname: "/note-create", params: { id_book: String(bookId) } });
  }, []);

  const goalConfigured = goalPages !== null && goalPages > 0;
  const goalPct = goalConfigured ? clamp01(stats.todayPages / goalPages!) : 0;

  const activePct = lastActiveProgress ? clamp01(lastActiveProgress.done / Math.max(1, lastActiveProgress.target)) : null;
  const activeCenterText = activePct !== null ? `${Math.round(activePct * 100)}%` : undefined;
  const activeLabelMain = lastActiveGoal
    ? lastActiveGoal.type === "pages"
      ? `${lastActiveProgress ? lastActiveProgress.done : 0} / ${lastActiveGoal.target} стр.`
      : `${lastActiveProgress ? Math.round((lastActiveProgress.done / 3600) * 10) / 10 : 0} / ${lastActiveGoal.target} ч`
    : null;

  const hasAnyReading = !!lastRead;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right", "top", "bottom"]} className="flex-1">
      <View className="items-center justify-center px-4 py-4" style={{ backgroundColor: BG }}>
        <Text className="text-4xl font-semibold" style={{ color: "#111827" }}>
          ReadWay
        </Text>
      </View>

      <View className="flex-1" style={{ backgroundColor: BG }}>
        <ScrollView className="flex-1" contentContainerClassName="px-4 pb-28" showsVerticalScrollIndicator={false}>
          {/* 1) Первый блок */}
          {booksCount === 0 ? (
            <Card className="mb-4 rounded-2xl bg-white px-4 py-4">
              <View className="items-center justify-center">
                <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
                  Добавьте свою первую книгу!
                </Text>
              </View>

              <Pressable className="mt-2 items-center justify-center" onPress={goToCreateBooks}>
                <View className="flex-row items-center gap-2">
                  <Text className="text-2xl font-semibold" style={{ color: PURPLE }}>
                    Добавить
                  </Text>
                  <Text className="text-3xl font-semibold" style={{ color: PURPLE }}>
                    +
                  </Text>
                </View>
              </Pressable>
            </Card>
          ) : hasAnyReading && lastRead ? (
            <Card className="mb-4 rounded-2xl bg-white px-4 py-4">
              <View className="flex-row items-center gap-3">
                <Pressable onPress={() => openBook(lastRead.id_book)}>
                  <BookThumb uri={lastRead.cover_path} size={56} />
                </Pressable>

                <View className="flex-1">
                  <Pressable onPress={() => openBook(lastRead.id_book)}>
                    <Text className="text-2xl font-semibold" style={{ color: "#111827" }} numberOfLines={1}>
                      {lastRead.name}
                    </Text>
                    <Text className="mt-1 text-base" style={{ color: TEXT_MUTED }} numberOfLines={1}>
                      {lastRead.publisher_name?.trim()?.length ? lastRead.publisher_name : " "}
                    </Text>
                  </Pressable>

                  <View className="mt-2 flex-row items-center gap-2">
                    <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                      Заметок: {lastRead.notes_count}
                    </Text>

                    <Pressable onPress={() => openCreateNote(lastRead.id_book)} hitSlop={10}>
                      <PlusIcon width={16} height={16} color={PURPLE} />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={() => openBook(lastRead.id_book)}
                  className="h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(0,0,0,0.06)" }}
                >
                  <PlayIcon width={26} height={26} color={PURPLE} />
                </Pressable>
              </View>

              {/* прогресс */}
              <View className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: PURPLE_SOFT }}>
                <View
                  className="h-full rounded-full"
                  style={{
                    width:
                      lastRead.page_count > 0
                        ? `${clamp01((lastRead.last_page ?? 0) / lastRead.page_count) * 100}%`
                        : "0%",
                    backgroundColor: PURPLE,
                  }}
                />
              </View>

              <Pressable
                onPress={() => openEditLastSession(lastRead.last_session_id, lastRead.id_book, lastRead.page_count)}
                className="mt-3 flex-row items-center justify-center gap-2"
              >
                <Text className="text-2xl font-semibold" style={{ color: TEXT_MUTED }}>
                  {lastRead.last_page} / {lastRead.page_count} стр.
                </Text>
                <PencilIcon width={18} height={18} color={TEXT_MUTED} />
              </Pressable>
            </Card>
          ) : (
            <Card className="mb-4 rounded-2xl bg-white px-4 py-4">
              <Pressable onPress={goToBooks} className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xl" style={{ color: TEXT_MUTED }}>
                    Книги добавлены
                  </Text>
                  <Text className="mt-1 text-2xl font-semibold" style={{ color: "#111827" }}>
                    Выберите книгу, чтобы начать
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} color="#6B677A" />
              </Pressable>
            </Card>
          )}

          {/* 2) Цель */}
          <Card className="mb-4 rounded-2xl bg-white px-4 py-4">
            <Pressable
              className="flex-row items-center gap-4"
              onPress={() => {
                if (lastActiveGoal) router.push({ pathname: "/goal-edit", params: { id: String(lastActiveGoal.id), returnTo: "/" } });
                else goToGoal();
              }}
            >
              <CircleProgress value={activePct ?? goalPct} centerText={activeCenterText ?? `${Math.round(goalPct * 100)}%`} />

              <View className="flex-1">
                {lastActiveGoal ? (
                  <>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
                        {lastActiveGoal.type === "pages" ? "Цель (страницы)" : "Цель (время)"}
                      </Text>
                      <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
                        {lastActiveGoal.type === "pages" ? `${lastActiveGoal.target} стр` : `${lastActiveGoal.target} ч`}
                      </Text>
                    </View>

                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
                        Прогресс
                      </Text>
                      <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
                        {activeLabelMain}
                      </Text>
                    </View>
                  </>
                ) : !goalConfigured ? (
                  <>
                    <Text className="text-xl" style={{ color: TEXT_MUTED }}>
                      Цель не выбрана
                    </Text>
                    <Text className="mt-1 text-2xl font-semibold" style={{ color: "#111827" }}>
                      Нажмите для выбора
                    </Text>
                  </>
                ) : (
                  <>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
                        Цель на день
                      </Text>
                      <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
                        {goalPages} стр
                      </Text>
                    </View>

                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
                        Прочитано
                      </Text>
                      <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
                        {stats.todayPages} стр
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </Pressable>
          </Card>

          {/* 3) Серия */}
          <Card className="mb-6 rounded-2xl bg-white px-4 py-4">
            <View className="flex-row items-center gap-3">
              <FireIcon width={24} height={24} color={stats.todayHasReading ? PURPLE : "#6B677A"} />
              <View className="flex-1 flex-row items-center justify-between">
                <View>
                  <Text className="text-base font-semibold" style={{ color: "#111827" }}>
                    Серия
                  </Text>
                </View>
                <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                  {stats.maxStreak} дней
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between px-1">
              <DayDot label="пн" active={stats.weekActive[0]} />
              <DayDot label="вт" active={stats.weekActive[1]} />
              <DayDot label="ср" active={stats.weekActive[2]} />
              <DayDot label="чт" active={stats.weekActive[3]} />
              <DayDot label="пт" active={stats.weekActive[4]} />
              <DayDot label="сб" active={stats.weekActive[5]} />
              <DayDot label="вс" active={stats.weekActive[6]} />
            </View>
          </Card>

          {/* 4) Другие книги + список 5 последних */}
          <Pressable className="mb-3 flex-row items-center gap-2" onPress={goToBooks}>
            <Text className="text-lg font-semibold" style={{ color: "#6B677A" }}>
              Другие книги
            </Text>
            <ChevronRightIcon width={18} height={18} color="#6B677A" />
          </Pressable>

          {recentBooks.length === 0 ? (
            <View className="items-center justify-center py-10">
              <Text className="text-base" style={{ color: "#6B677A" }}>
                Пока нет прочитанных книг
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {recentBooks.map((b) => {
                const pct = b.page_count > 0 ? clamp01((b.last_page ?? 0) / b.page_count) : 0;

                return (
                  <Pressable key={b.id_book} onPress={() => openBook(b.id_book)}>
                    <Card className="rounded-2xl bg-white px-4 py-4">
                      <View className="flex-row items-center gap-3">
                        <BookThumb uri={b.cover_path} size={52} />

                        <View className="flex-1">
                          <Text className="text-xl font-semibold" style={{ color: "#111827" }} numberOfLines={1}>
                            {b.name}
                          </Text>

                          <Text className="mt-1 text-sm" style={{ color: TEXT_MUTED }} numberOfLines={1}>
                            {b.publisher_name?.trim()?.length ? b.publisher_name : " "}
                          </Text>

                          <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: PURPLE_SOFT }}>
                            <View className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: PURPLE }} />
                          </View>

                          <Text className="mt-2 text-sm font-semibold" style={{ color: TEXT_MUTED }}>
                            {b.last_page} / {b.page_count} стр.
                          </Text>
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* FAB */}
        <View className="absolute bottom-6 right-6">
          <Pressable
            className="h-14 w-14 items-center justify-center rounded-full"
            onPress={goToCreateBooks}
            style={{ backgroundColor: PURPLE_SOFT }}
          >
            <PlusIcon width={24} height={24} color={PURPLE} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
