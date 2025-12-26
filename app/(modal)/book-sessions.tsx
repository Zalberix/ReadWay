import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

import { Sheet, SheetContent } from "@/components/ui/sheet";

import BackIcon from "@/assets/icons/back.svg";
import PlusIcon from "@/assets/icons/plus.svg";
import PencilIcon from "@/assets/icons/pencil.svg";
import TrashIcon from "@/assets/icons/trash.svg";

import { useSessionsRepository, type SessionRow } from "@/src/features/sessions/sessions.repository";

const BG = "#F4F0FF";
const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const TEXT_MUTED = "#7C7790";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDateTime(sqliteDate: string) {
  const d = new Date(sqliteDate.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return sqliteDate;
  const yy = String(d.getFullYear()).slice(-2);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${yy} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function toTimeMs(sqliteDate: string) {
  const d = new Date(sqliteDate.replace(" ", "T"));
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

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

  // sheet delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SessionRow | null>(null);

  const load = useCallback(async () => {
    if (!bookId) return;

    const book = await db.getFirstAsync<{ page_count: number }>(`SELECT page_count FROM books WHERE id_book = ?`, [
      bookId,
    ]);

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

  const openDelete = useCallback((s: SessionRow) => {
    setDeleteTarget(s);
    setDeleteOpen(true);
  }, []);

  const closeDelete = useCallback(() => {
    setDeleteOpen(false);
    setDeleteTarget(null);
  }, []);

  const onConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    // если у тебя метод называется иначе — поменяй тут
    // Рекомендуется добавить в репозиторий remove(id) (см. ниже)
    await sessionsRepo.remove(deleteTarget.id);

    closeDelete();
    await load();
  }, [closeDelete, deleteTarget, load, sessionsRepo]);

  // delta/день считаем по хронологии (от старых к новым)
  const { deltaById, dayById, sortedForView } = useMemo(() => {
    const list = [...sessions];

    const chrono = [...list].sort((a, b) => toTimeMs(a.created_at) - toTimeMs(b.created_at));

    const deltaMap = new Map<number, number>();
    const dayMap = new Map<number, number>();

    for (let i = 0; i < chrono.length; i++) {
      const cur = chrono[i];
      const prev = chrono[i - 1];

      const curPage = Number(cur.current_page ?? 0);
      const prevPage = Number(prev?.current_page ?? 0);

      const delta = i === 0 ? curPage : curPage - prevPage;

      deltaMap.set(cur.id, delta);
      dayMap.set(cur.id, i + 1);
    }

    const view = [...list].sort((a, b) => toTimeMs(b.created_at) - toTimeMs(a.created_at));

    return { deltaById: deltaMap, dayById: dayMap, sortedForView: view };
  }, [sessions]);

  function RightAction({
                         progress,
                         onPress,
                       }: {
    progress: SharedValue<number>;
    onPress: () => void;
  }) {
    const anim = useAnimatedStyle(() => {
      const t = interpolate(progress.value, [0, 1], [40, 0]);
      return { transform: [{ translateX: t }] };
    });

    return (
      <Animated.View style={[{ width: 92, justifyContent: "center" }, anim]}>
        <Pressable
          onPress={onPress}
          className="ml-3 h-full items-center justify-center rounded-2xl"
          style={{ backgroundColor: PURPLE_SOFT }}
        >
          <TrashIcon width={22} height={22} color={PURPLE} />
          <Text className="mt-1 text-xs font-semibold" style={{ color: PURPLE }}>
            Удалить
          </Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: BG }} edges={["left", "right", "top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full">
          <BackIcon width={24} height={24} color="#374151" />
        </Pressable>

        <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
          Сеансы
        </Text>

        <Pressable onPress={goCreate} className="h-10 w-10 items-center justify-center rounded-full">
          <PlusIcon width={24} height={24} color={PURPLE} />
        </Pressable>
      </View>

        {sortedForView.length === 0 ? (
          <View className="w-full h-full flex items-center justify-center ">
            <Text className="text-base" style={{ color: TEXT_MUTED }}>
              Сеансов пока нет
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerClassName="px-4 pb-28" showsVerticalScrollIndicator={false}>
            {
              sortedForView.map((s) => {
              const dayNum = dayById.get(s.id) ?? 1;
              const dayLabel = `Сессия ${dayNum}`;

              const pct = maxPages > 0 ? Math.max(0, Math.min(1, s.current_page / maxPages)) : 0;

              const delta = deltaById.get(s.id) ?? 0;
              const deltaLabel = delta >= 1 ? `(+${delta})` : "";

              return (
                <View key={s.id} className="mb-4">
                  <ReanimatedSwipeable
                    renderRightActions={(progress) => (
                      <RightAction
                        progress={progress}
                        onPress={() => openDelete(s)}
                      />
                    )}
                    rightThreshold={24}
                    friction={2}
                    overshootRight={false}
                  >
                    <Card className="rounded-2xl bg-white px-4 py-4">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
                          {dayLabel}
                        </Text>
                        <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                          {formatDateTime(s.created_at)}
                        </Text>
                      </View>

                      <Text className="mt-3 text-3xl font-semibold" style={{ color: "#111827" }}>
                        {formatDurationHuman(s.time)}
                      </Text>

                      <View
                        className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
                        style={{ backgroundColor: PURPLE_SOFT }}
                      >
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${pct * 100}%`,
                            backgroundColor: PURPLE,
                          }}
                        />
                      </View>

                      <View className="mt-3 flex-row items-center justify-center gap-2">
                        <Pressable onPress={() => goEdit(s)} className="flex-row items-center justify-center gap-2">
                          <Text className="text-2xl font-semibold" style={{ color: TEXT_MUTED }}>
                            {s.current_page} / {maxPages} стр. {deltaLabel}
                          </Text>
                          <PencilIcon width={18} height={18} color={PURPLE} />
                        </Pressable>
                      </View>
                    </Card>
                  </ReanimatedSwipeable>
                </View>
              );
            })}
          </ScrollView>
        )}
      {/* Delete sheet */}
      <Sheet open={deleteOpen} onOpenChange={(v) => (v ? setDeleteOpen(true) : closeDelete())}>
        <SheetContent snapPoints={["33%"]} style={{ backgroundColor: "#FAF7F2" }}>
          <View className="items-center">
            <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
              Удалить сессию?
            </Text>

            <Text className="mt-2 text-base text-center" style={{ color: TEXT_MUTED }}>
              Сессия будет удалена без возможности восстановления.
            </Text>
          </View>

          <View className="mt-6 gap-3">
            <Button className="h-14 rounded-2xl" style={{ backgroundColor: PURPLE }} onPress={onConfirmDelete}>
              <Text className="text-lg font-semibold" style={{ color: "#FFFFFF" }}>
                Удалить
              </Text>
            </Button>

            <Button
              variant="secondary"
              className="h-14 rounded-2xl"
              style={{ backgroundColor: "#FFFFFF" }}
              onPress={closeDelete}
            >
              <Text className="text-lg font-semibold" style={{ color: "#111827" }}>
                Отмена
              </Text>
            </Button>
          </View>
        </SheetContent>
      </Sheet>
    </SafeAreaView>
  );
}

/**
 * ВАЖНО: если в sessions.repository нет remove — добавь:
 *
 * async remove(id: number): Promise<void> {
 *   await db.runAsync(`DELETE FROM sessions WHERE id = ?`, [id]);
 * }
 */
