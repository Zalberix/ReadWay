import React, { useCallback, useEffect, useMemo, useState } from "react";
import {FlatList, Pressable, View} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import BackIcon from "@/assets/icons/back.svg";
import { useSessionsRepository } from "@/src/features/sessions/sessions.repository";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {WheelNumberPicker} from "@/components/WheelNumberPicker";
import CheckIcon from "@/assets/icons/check.svg";

const BG = "#F4F0FF";
const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const TEXT_MUTED = "#7C7790";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function nowInputs() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  return {
    date: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${yy}`, // 11.10.25
    clock: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,       // 12:22
  };
}

function toSQLiteDateTime(dateStr: string, clockStr: string) {
  // date: DD.MM.YY or DD.MM.YYYY
  // clock: HH:MM
  const [ddS, mmS, yyS] = dateStr.split(".");
  const [hhS, minS] = clockStr.split(":");

  const dd = Number(ddS);
  const mm = Number(mmS);
  const yy = Number(yyS);
  const hh = Number(hhS);
  const min = Number(minS);

  if (!dd || !mm || !yyS || Number.isNaN(hh) || Number.isNaN(min)) return null;

  const year = yy < 100 ? 2000 + yy : yy;
  return `${year}-${pad2(mm)}-${pad2(dd)} ${pad2(hh)}:${pad2(min)}:00`;
}

export default function SessionCreateScreen() {
  const sessionsRepo = useSessionsRepository();
  const params = useLocalSearchParams<{
    id_book?: string;
    page?: string;
    max?: string;
  }>();

  const bookId = useMemo(() => Number(params.id_book ?? 0), [params.id_book]);
  const maxPages = useMemo(() => Math.max(0, Number(params.max ?? 0)), [params.max]);

  const initialPage = useMemo(() => {
    const n = Number(params.page ?? 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(maxPages, n));
  }, [maxPages, params.page]);

  const init = useMemo(() => nowInputs(), []);
  const [date, setDate] = useState(init.date);
  const [clock, setClock] = useState(init.clock);

  // время сеанса: по твоему требованию поле есть, храним в минутах
  const [minutes, setMinutes] = useState("30");

  // страница
  const [page, setPage] = useState<number>(initialPage);

  // sheet выбора страницы
  const [pageSheetOpen, setPageSheetOpen] = useState(true); // открыть сразу

  const pages = useMemo(() => {
    return Array.from({ length: maxPages + 1 }, (_, i) => i);
  }, [maxPages]);

  // на Android FlatList initialScrollIndex иногда требует getItemLayout
  const getItemLayout = useCallback((_: any, index: number) => {
    return { length: 52, offset: 52 * index, index };
  }, []);

  const openSheet = useCallback(() => setPageSheetOpen(true), []);
  const closeSheet = useCallback(() => setPageSheetOpen(false), []);

  const onPickPage = useCallback(
    (p: number) => {
      setPage(p);
      closeSheet();
    },
    [closeSheet],
  );

  const save = useCallback(async () => {
    if (!bookId) return;

    const mins = Math.max(0, Number(minutes.replace(/[^\d]/g, "")) || 0);
    const created_at = toSQLiteDateTime(date.trim(), clock.trim());

    await sessionsRepo.create({
      id_book: bookId,
      time: mins * 60,
      current_page: page,
      created_at: created_at ?? undefined,
    });

    router.back();
  }, [bookId, clock, date, minutes, page, sessionsRepo]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: BG }} edges={["left", "right", "top", "bottom"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()} className="h-10 w-10 rounded-full">
            <BackIcon width={24} height={24} color="#374151" />
          </Button>

          <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
            Новый сеанс
          </Text>

          <Pressable
            onPress={save}
            className="h-10 w-10 items-center justify-center rounded-full"
          >
            <CheckIcon width={24} height={24} />
          </Pressable>
        </View>

        <View className="px-4">
          <Card className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            {/* 1) дата */}
            <Text className="text-sm font-semibold" style={{ color: TEXT_MUTED }}>
              Дата сеанса
            </Text>
            <Input
              value={date}
              onChangeText={setDate}
              placeholder="11.10.25"
              className="mt-2"
            />

            {/* 2) время сеанса (мин) */}
            <Text className="mt-4 text-sm font-semibold" style={{ color: TEXT_MUTED }}>
              Время сеанса (мин)
            </Text>
            <Input
              value={minutes}
              onChangeText={setMinutes}
              placeholder="30"
              keyboardType="numeric"
              className="mt-2"
            />

            {/* (опционально, но полезно для created_at) */}
            <Text className="mt-4 text-sm font-semibold" style={{ color: TEXT_MUTED }}>
              Время (часы:мин)
            </Text>
            <Input
              value={clock}
              onChangeText={setClock}
              placeholder="12:22"
              className="mt-2"
            />

            {/* 3) страница */}
            <View className="mt-5 flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-semibold" style={{ color: TEXT_MUTED }}>
                  Страница
                </Text>
                <Text className="mt-1 text-base font-semibold" style={{ color: "#111827" }}>
                  с. {page} / {maxPages}
                </Text>
              </View>

              <Button
                variant="secondary"
                onPress={openSheet}
                className="rounded-xl"
                style={{ backgroundColor: PURPLE_SOFT }}
              >
                <Text className="text-sm font-semibold" style={{ color: PURPLE }}>
                  Выбрать
                </Text>
              </Button>
            </View>
          </Card>
        </View>

        {/* Sheet выбора страницы */}
        <Sheet open={pageSheetOpen} onOpenChange={setPageSheetOpen}>
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
                highlightBg={"#EDE7FF"}        // под твою пастель
                highlightBorder={PURPLE_SOFT}
                textColor={"#111827"}
                mutedColor={TEXT_MUTED}
              />
            </View>

            <Button
              className="mt-6 h-14 rounded-2xl"
              style={{ backgroundColor: "#3B6EA0" }} // как на скрине (синий)
              onPress={() => {
                // сохранили выбранную страницу в форме и закрыли sheet
                setPageSheetOpen(false);
              }}
            >
              <Text className="text-2xl font-semibold" style={{ color: "#FFFFFF" }}>
                ✓
              </Text>
            </Button>
          </SheetContent>
        </Sheet>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
