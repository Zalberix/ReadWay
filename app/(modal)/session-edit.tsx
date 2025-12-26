import React, { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import BackIcon from "@/assets/icons/back.svg";
import CheckIcon from "@/assets/icons/check.svg";

import { WheelNumberPicker } from "@/components/WheelNumberPicker";
import { useSessionsRepository } from "@/src/features/sessions/sessions.repository";

const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const TEXT_MUTED = "#7C7790";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDateRU(d: Date) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function formatTimeRU(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function toSQLiteDateTimeFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes(),
  )}:00`;
}

function parseSQLiteDateTime(sql: string) {
  // "YYYY-MM-DD HH:MM:SS" -> Date
  const d = new Date(sql.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatHMS(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
}

type OpenSheet = null | "time" | "page" | "datePicker" | "timePicker";

function CardRow({
                   title,
                   value,
                   icon,
                   onPress,
                 }: {
  title: string;
  value: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card className="mb-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
        <View className="flex-row items-center gap-4">
          <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: PURPLE_SOFT }}>
            <Text className="text-2xl" style={{ color: PURPLE }}>
              {icon}
            </Text>
          </View>

          <View className="flex-1">
            <Text className="text-sm font-semibold" style={{ color: TEXT_MUTED }}>
              {title}
            </Text>
            <Text className="mt-1 text-2xl font-semibold" style={{ color: "#111827" }}>
              {value}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export default function SessionEditScreen() {
  const sessionsRepo = useSessionsRepository();

  const params = useLocalSearchParams<{ id?: string; id_book?: string; max?: string }>();
  const sessionId = useMemo(() => Number(params.id ?? 0), [params.id]);
  const maxPages = useMemo(() => Math.max(0, Number(params.max ?? 0)), [params.max]);

  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const closeSheet = useCallback(() => setOpenSheet(null), []);

  const [sessionDateTime, setSessionDateTime] = useState<Date>(() => new Date());

  // duration (H/M/S)
  const [hours, setHours] = useState(0);
  const [mins, setMins] = useState(0);
  const [secs, setSecs] = useState(0);

  const durationSec = useMemo(() => hours * 3600 + mins * 60 + secs, [hours, mins, secs]);

  // page
  const [page, setPage] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        if (!sessionId) return;

        const s = await sessionsRepo.getById(sessionId);
        if (cancelled || !s) return;

        const dt = parseSQLiteDateTime(s.created_at);
        const total = Math.max(0, Math.floor(s.time ?? 0));

        const hh = Math.floor(total / 3600);
        const mm = Math.floor((total % 3600) / 60);
        const ss = total % 60;

        setSessionDateTime(dt);
        setHours(clamp(hh, 0, 23));
        setMins(clamp(mm, 0, 59));
        setSecs(clamp(ss, 0, 59));
        setPage(clamp(Number(s.current_page ?? 0), 0, maxPages));
      })();

      return () => {
        cancelled = true;
      };
    }, [maxPages, sessionId, sessionsRepo]),
  );

  const save = useCallback(async () => {
    if (!sessionId) return;

    await sessionsRepo.update(sessionId, {
      time: durationSec,
      current_page: page,
      created_at: toSQLiteDateTimeFromDate(sessionDateTime),
    });

    router.back();
  }, [durationSec, page, sessionDateTime, sessionId, sessionsRepo]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: "#FAF7F2" }} edges={["left", "right", "top", "bottom"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()} className="h-10 w-10 rounded-full">
            <BackIcon width={24} height={24} color="#374151" />
          </Button>

          <Button onPress={save} className="h-11 flex-row items-center gap-2 rounded-full px-5" style={{ backgroundColor: "#FFFFFF" }}>
            <CheckIcon width={20} height={20} />
            <Text className="text-base font-semibold" style={{ color: "#111827" }}>
              Сохранить
            </Text>
          </Button>
        </View>

        <View className="px-6 pt-4">
          <Text className="text-4xl font-semibold" style={{ color: "#111827" }}>
            Сохранить сеанс чтения
          </Text>
          <Text className="mt-2 text-base" style={{ color: TEXT_MUTED }}>
            Пожалуйста проверьте содержимое, которое нужно сохранить.
          </Text>

          {/* дата + время */}
          <View className="mt-6 flex-row items-center gap-4">
            <Pressable onPress={() => setOpenSheet("datePicker")} className="flex-row items-center">
              <Text className="text-base font-semibold" style={{ color: "#111827", textDecorationLine: "underline" }}>
                {formatDateRU(sessionDateTime)}
              </Text>
            </Pressable>

            <Pressable onPress={() => setOpenSheet("timePicker")} className="flex-row items-center">
              <Text className="text-base font-semibold" style={{ color: "#111827", textDecorationLine: "underline" }}>
                {formatTimeRU(sessionDateTime)}
              </Text>
            </Pressable>
          </View>

          {/* блоки */}
          <View className="mt-6">
            <CardRow title="Вы читали" value={formatHMS(durationSec)} icon="⏱" onPress={() => setOpenSheet("time")} />
            <CardRow title="Прочитано" value={`с. ${page} / ${maxPages}`} icon="🔖" onPress={() => setOpenSheet("page")} />
          </View>
        </View>

        {/* Sheet: Время (H/M/S) */}
        <Sheet open={openSheet === "time"} onOpenChange={(v) => (v ? setOpenSheet("time") : closeSheet())}>
          <SheetContent snapPoints={["55%"]} style={{ backgroundColor: "#FAF7F2" }}>
            <View className="items-center">
              <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
                Сколько вы читали?
              </Text>
              <Text className="mt-1 text-base" style={{ color: TEXT_MUTED }}>
                Выберите часы, минуты и секунды
              </Text>
            </View>

            <View className="mt-6 flex-row items-start gap-3">
              <View className="flex-1">
                <Text className="mb-2 text-center text-sm font-semibold" style={{ color: TEXT_MUTED }}>
                  Часы
                </Text>
                <WheelNumberPicker
                  min={0}
                  max={23}
                  value={hours}
                  onChange={setHours}
                  highlightBg={"#EDE7FF"}
                  highlightBorder={PURPLE_SOFT}
                  textColor={"#111827"}
                  mutedColor={TEXT_MUTED}
                />
              </View>

              <View className="flex-1">
                <Text className="mb-2 text-center text-sm font-semibold" style={{ color: TEXT_MUTED }}>
                  Мин
                </Text>
                <WheelNumberPicker
                  min={0}
                  max={59}
                  value={mins}
                  onChange={setMins}
                  highlightBg={"#EDE7FF"}
                  highlightBorder={PURPLE_SOFT}
                  textColor={"#111827"}
                  mutedColor={TEXT_MUTED}
                />
              </View>

              <View className="flex-1">
                <Text className="mb-2 text-center text-sm font-semibold" style={{ color: TEXT_MUTED }}>
                  Сек
                </Text>
                <WheelNumberPicker
                  min={0}
                  max={59}
                  value={secs}
                  onChange={setSecs}
                  highlightBg={"#EDE7FF"}
                  highlightBorder={PURPLE_SOFT}
                  textColor={"#111827"}
                  mutedColor={TEXT_MUTED}
                />
              </View>
            </View>

            <Button className="mt-6 h-14 rounded-2xl" style={{ backgroundColor: "#3B6EA0" }} onPress={closeSheet}>
              <Text className="text-2xl font-semibold" style={{ color: "#FFFFFF" }}>
                ✓
              </Text>
            </Button>
          </SheetContent>
        </Sheet>

        {/* Sheet: Страница */}
        <Sheet open={openSheet === "page"} onOpenChange={(v) => (v ? setOpenSheet("page") : closeSheet())}>
          <SheetContent snapPoints={["55%"]} style={{ backgroundColor: "#FAF7F2" }}>
            <View className="items-center">
              <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
                Сколько вы прочитали?
              </Text>
            </View>

            <View className="mt-6">
              <WheelNumberPicker
                min={0}
                max={maxPages}
                value={page}
                onChange={setPage}
                highlightBg={"#EDE7FF"}
                highlightBorder={PURPLE_SOFT}
                textColor={"#111827"}
                mutedColor={TEXT_MUTED}
              />
            </View>

            <Button className="mt-6 h-14 rounded-2xl" style={{ backgroundColor: "#3B6EA0" }} onPress={closeSheet}>
              <Text className="text-2xl font-semibold" style={{ color: "#FFFFFF" }}>
                ✓
              </Text>
            </Button>
          </SheetContent>
        </Sheet>

        {/* Date picker */}
        <Sheet open={openSheet === "datePicker"} onOpenChange={(v) => (v ? setOpenSheet("datePicker") : closeSheet())}>
          <SheetContent snapPoints={["55%"]} style={{ backgroundColor: "#FAF7F2" }}>
            <View className="items-center">
              <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
                Дата сеанса
              </Text>
            </View>

            <View className="mt-6 items-center">
              <DateTimePicker
                value={sessionDateTime}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e: DateTimePickerEvent, selected?: Date) => {
                  if (!selected) return;

                  setSessionDateTime((prev) => {
                    const next = new Date(prev);
                    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                    return next;
                  });

                  if (Platform.OS !== "ios") closeSheet();
                }}
              />
            </View>

            {Platform.OS === "ios" && (
              <Button className="mt-6 h-14 rounded-2xl" style={{ backgroundColor: "#3B6EA0" }} onPress={closeSheet}>
                <Text className="text-2xl font-semibold" style={{ color: "#FFFFFF" }}>
                  ✓
                </Text>
              </Button>
            )}
          </SheetContent>
        </Sheet>

        {/* Time picker */}
        <Sheet open={openSheet === "timePicker"} onOpenChange={(v) => (v ? setOpenSheet("timePicker") : closeSheet())}>
          <SheetContent snapPoints={["55%"]} style={{ backgroundColor: "#FAF7F2" }}>
            <View className="items-center">
              <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
                Время сеанса
              </Text>
            </View>

            <View className="mt-6 items-center">
              <DateTimePicker
                value={sessionDateTime}
                mode="time"
                is24Hour
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e: DateTimePickerEvent, selected?: Date) => {
                  if (!selected) return;

                  setSessionDateTime((prev) => {
                    const next = new Date(prev);
                    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                    return next;
                  });

                  if (Platform.OS !== "ios") closeSheet();
                }}
              />
            </View>

            {Platform.OS === "ios" && (
              <Button className="mt-6 h-14 rounded-2xl" style={{ backgroundColor: "#3B6EA0" }} onPress={closeSheet}>
                <Text className="text-2xl font-semibold" style={{ color: "#FFFFFF" }}>
                  ✓
                </Text>
              </Button>
            )}
          </SheetContent>
        </Sheet>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
