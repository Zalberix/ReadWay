import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Sheet, SheetContent } from "@/components/ui/sheet";

import BackIcon from "@/assets/icons/back.svg";
import CheckIcon from "@/assets/icons/check.svg";

import { WheelNumberPicker } from "@/components/WheelNumberPicker";
import { useSessionsRepository } from "@/src/features/sessions/sessions.repository";

const BG = "#F4F0FF";
const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const TEXT_MUTED = "#7C7790";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function SessionEditScreen() {
  const sessionsRepo = useSessionsRepository();

  const params = useLocalSearchParams<{ id?: string; id_book?: string; max?: string }>();
  const sessionId = useMemo(() => Number(params.id ?? 0), [params.id]);
  const maxPages = useMemo(() => Math.max(0, Number(params.max ?? 0)), [params.max]);

  const [openSheet, setOpenSheet] = useState<null | "date" | "time" | "page">(null);

  const [sessionDateTime, setSessionDateTime] = useState<Date>(new Date());
  const [seconds, setSeconds] = useState(0);
  const [page, setPage] = useState(0);

  const closeSheet = () => setOpenSheet(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        if (!sessionId) return;
        const s = await sessionsRepo.getById(sessionId);
        if (cancelled || !s) return;

        // created_at: "YYYY-MM-DD HH:MM:SS"
        const d = new Date(s.created_at.replace(" ", "T"));
        setSessionDateTime(Number.isNaN(d.getTime()) ? new Date() : d);
        setSeconds(s.time);
        setPage(s.current_page);
      })();

      return () => {
        cancelled = true;
      };
    }, [sessionId, sessionsRepo]),
  );

  const save = useCallback(async () => {
    if (!sessionId) return;

    const created_at = `${sessionDateTime.getFullYear()}-${pad2(sessionDateTime.getMonth() + 1)}-${pad2(
      sessionDateTime.getDate(),
    )} ${pad2(sessionDateTime.getHours())}:${pad2(sessionDateTime.getMinutes())}:00`;

    await sessionsRepo.update(sessionId, {
      time: seconds,
      current_page: page,
      created_at,
    });

    router.back();
  }, [page, seconds, sessionDateTime, sessionId, sessionsRepo]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: BG }} edges={["left", "right", "top", "bottom"]}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onPress={() => router.back()} className="h-10 w-10 rounded-full">
          <BackIcon width={24} height={24} color="#374151" />
        </Button>

        <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
          Редактировать
        </Text>

        <Button variant="ghost" size="icon" onPress={save} className="h-10 w-10 rounded-full">
          <CheckIcon width={24} height={24} />
        </Button>
      </View>

      <View className="px-4">
        <Text className="mt-3 text-4xl font-semibold" style={{ color: "#111827" }}>
          Сохранить сеанс чтения
        </Text>
        <Text className="mt-2 text-base" style={{ color: TEXT_MUTED }}>
          Проверьте данные, которые нужно сохранить.
        </Text>

        <View className="mt-6 flex-row gap-3">
          <Button
            variant="ghost"
            className="rounded-xl px-0"
            onPress={() => setOpenSheet("date")}
          >
            <Text className="text-base underline" style={{ color: "#111827" }}>
              {pad2(sessionDateTime.getDate())}.{pad2(sessionDateTime.getMonth() + 1)}.{String(sessionDateTime.getFullYear())}
            </Text>
          </Button>

          <Button
            variant="ghost"
            className="rounded-xl px-0"
            onPress={() => setOpenSheet("time")}
          >
            <Text className="text-base underline" style={{ color: "#111827" }}>
              {pad2(sessionDateTime.getHours())}:{pad2(sessionDateTime.getMinutes())}
            </Text>
          </Button>
        </View>

        <View className="mt-4 gap-3">
          {/* Вы читали */}
          <Button
            variant="ghost"
            className="rounded-2xl px-0"
            onPress={() => setOpenSheet("time")}
          >
            <Card className="w-full rounded-2xl bg-white px-4 py-4 shadow-sm">
              <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                Вы читали
              </Text>
              <Text className="mt-1 text-3xl font-semibold" style={{ color: "#111827" }}>
                {pad2(minutes)}:{pad2(secs)}:00
              </Text>
            </Card>
          </Button>

          {/* Прочитано */}
          <Button
            variant="ghost"
            className="rounded-2xl px-0"
            onPress={() => setOpenSheet("page")}
          >
            <Card className="w-full rounded-2xl bg-white px-4 py-4 shadow-sm">
              <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                Прочитано
              </Text>
              <Text className="mt-1 text-3xl font-semibold" style={{ color: "#111827" }}>
                с. {page} <Text className="text-xl" style={{ color: TEXT_MUTED }}>/ {maxPages}</Text>
              </Text>
            </Card>
          </Button>
        </View>
      </View>

      {/* Date picker */}
      <Sheet open={openSheet === "date"} onOpenChange={(v) => (v ? setOpenSheet("date") : closeSheet())}>
        <SheetContent snapPoints={["55%"]} style={{ backgroundColor: "#FAF7F2" }}>
          <View className="items-center">
            <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
              Дата
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

      {/* Time picker (и как “вы читали”) */}
      <Sheet open={openSheet === "time"} onOpenChange={(v) => (v ? setOpenSheet("time") : closeSheet())}>
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

      {/* Page picker */}
      <Sheet open={openSheet === "page"} onOpenChange={(v) => (v ? setOpenSheet("page") : closeSheet())}>
        <SheetContent snapPoints={["72%"]} style={{ backgroundColor: "#FAF7F2" }}>
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
              onChange={(v) => setPage(v)}
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
    </SafeAreaView>
  );
}
