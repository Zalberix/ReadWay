import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

import BackIcon from "@/assets/icons/back.svg";
import PlusIcon from "@/assets/icons/plus.svg";
import PencilIcon from "@/assets/icons/pencil.svg"; // поправь путь под свой pencil

import { useSessionsRepository, type SessionRow } from "@/src/features/sessions/sessions.repository";

const BG = "#F4F0FF";
const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const TEXT_MUTED = "#7C7790";

function formatDateTime(sqliteDate: string) {
  const d = new Date(sqliteDate.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return sqliteDate;
  const pad = (n: number) => String(n).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${yy} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "1 ч 45 мин"
function formatDurationHuman(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);

  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ч`);
  parts.push(`${m} мин`);
  return parts.join(" ");
}

export default function BookSessionsScreen() {
  const db = useSQLiteContext();
  const sessionsRepo = useSessionsRepository();

  const params = useLocalSearchParams<{ id_book?: string }>();
  const bookId = useMemo(() => Number(params.id_book ?? 0), [params.id_book]);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [maxPages, setMaxPages] = useState(0);

  const load = useCallback(async () => {
    if (!bookId) return;

    const book = await db.getFirstAsync<{ page_count: number }>(
      `SELECT page_count FROM books WHERE id_book = ?`,
      [bookId],
    );

    const list = await sessionsRepo.listByBook(bookId);

    setMaxPages(book?.page_count ?? 0);
    setSessions(list);
  }, [bookId, db, sessionsRepo]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const goCreate = useCallback(() => {
    router.push({
      pathname: "/session-create",
      params: {
        id_book: String(bookId),
        page: "0",
        max: String(maxPages),
      },
    });
  }, [bookId, maxPages]);

  const goEdit = useCallback(
    (s: SessionRow) => {
      router.push({
        pathname: "/session-edit",
        params: {
          id: String(s.id),
          id_book: String(bookId),
          max: String(maxPages),
        },
      });
    },
    [bookId, maxPages],
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: BG }} edges={["left", "right", "top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full">
          <BackIcon width={24} height={24} color="#374151" />
        </Pressable>

        <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
          Сессии
        </Text>

        <Pressable onPress={goCreate} className="h-10 w-10 items-center justify-center rounded-full">
          <PlusIcon width={24} height={24} color={PURPLE} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-28" showsVerticalScrollIndicator={false}>
        {sessions.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Text className="text-base" style={{ color: TEXT_MUTED }}>
              Сессий пока нет
            </Text>
          </View>
        ) : (
          sessions.map((s, idx) => {
            const dayLabel = `День ${sessions.length - idx}`; // если нужно наоборот — поменяй на idx + 1
            const pct = maxPages > 0 ? Math.max(0, Math.min(1, s.current_page / maxPages)) : 0;

            // (+70) — это не известно из схемы, поэтому считаем как "прирост относительно следующего (более старого) сеанса"
            const older = sessions[idx + 1]; // следующая в списке = более старая
            const delta = idx === 0
              ? s.current_page // первая: от 0
              : older
                ? s.current_page - older.current_page
                : 0;

            const deltaLabel = delta > 0 ? `(+${delta})` : "";

            return (
              <Card key={s.id} className="mb-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
                {/* Top row: day + datetime */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
                    {dayLabel}
                  </Text>
                  <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                    {formatDateTime(s.created_at)}
                  </Text>
                </View>

                {/* Duration */}
                <Text className="mt-3 text-3xl font-semibold" style={{ color: "#111827" }}>
                  {formatDurationHuman(s.time)}
                </Text>

                {/* Progress line */}
                <View className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: PURPLE_SOFT }}>
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${pct * 100}%`,
                      backgroundColor: PURPLE,
                    }}
                  />
                </View>

                {/* Bottom row: pages + pencil */}
                <View className="mt-3 flex-row items-center justify-center gap-2">
                  <Pressable onPress={() => goEdit(s)} className="flex-row items-center justify-center gap-2">
                    <Text className="text-2xl font-semibold" style={{ color: TEXT_MUTED }}>
                      {s.current_page} / {maxPages} стр. {deltaLabel}
                    </Text>

                    <PencilIcon width={18} height={18} color={PURPLE} />
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
