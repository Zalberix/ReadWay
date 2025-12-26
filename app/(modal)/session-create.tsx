import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { WheelNumberPicker } from "@/components/WheelNumberPicker";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Platform } from "react-native";



import BackIcon from "@/assets/icons/back.svg";
import CheckIcon from "@/assets/icons/check.svg";

import { useBooksRepository } from "@/src/features/books/books.repository";
import { useSessionsRepository } from "@/src/features/sessions/sessions.repository";

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
    date: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${yy}`,
    clock: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

function formatDateRU(d: Date) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function formatTimeRU(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function toSQLiteDateTimeFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
}


function toSQLiteDateTime(dateStr: string, clockStr: string) {
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

function formatHMS(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
}

type ReadingStatus = "to_read" | "reading" | "done" | "dropped";

const STATUS_LABEL: Record<ReadingStatus, string> = {
  to_read: "К прочтению",
  reading: "Читаю",
  done: "Завершено",
  dropped: "Заброшено",
};

type OpenSheet = null | "time" | "page" | "status" | "datePicker" | "timePicker";


function CardRow({
                   title,
                   value,
                   icon,
                   onPress,
                 }: {
  title: string;
  value: string;
  icon: string; // emoji (чтобы не тянуть иконки)
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card className="mb-4 rounded-2xl bg-white px-4 py-4">
        <View className="flex-row items-center gap-4">
          <View
            className="h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: PURPLE_SOFT }}
          >
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

export default function SessionCreateScreen() {
  const sessionsRepo = useSessionsRepository();
  const booksRepo = useBooksRepository();

  const params = useLocalSearchParams<{
    id_book?: string;
    page?: string;
    max?: string;
    durationSec?: string; // prefill duration in seconds
    sessionDateISO?: string; // prefill session start datetime ISO
  }>();

  const bookId = useMemo(() => Number(params.id_book ?? 0), [params.id_book]);
  const maxPages = useMemo(() => Math.max(0, Number(params.max ?? 0)), [params.max]);

  const initialPage = useMemo(() => {
    const n = Number(params.page ?? 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(maxPages, n));
  }, [maxPages, params.page]);

  const init = useMemo(() => nowInputs(), []);
  const initialSessionDate = useMemo(() => {
    try {
      if (params.sessionDateISO) return new Date(String(params.sessionDateISO));
    } catch {}
    return new Date();
  }, [params.sessionDateISO]);

  const initialDuration = useMemo(() => {
    const v = Number(params.durationSec ?? 0);
    return Number.isFinite(v) && v > 0 ? Math.max(0, Math.floor(v)) : 0;
  }, [params.durationSec]);

  const [sessionDateTime, setSessionDateTime] = useState<Date>(() => new Date(initialSessionDate));


  // время чтения (H/M/S)
  const [hours, setHours] = useState(() => Math.floor(initialDuration / 3600));
  const [mins, setMins] = useState(() => Math.floor((initialDuration % 3600) / 60));
  const [secs, setSecs] = useState(() => initialDuration % 60);

  const durationSec = useMemo(() => hours * 3600 + mins * 60 + secs, [hours, mins, secs]);

  // страница
  const [page, setPage] = useState<number>(initialPage);

  // статус
  const [status, setStatus] = useState<ReadingStatus>("reading");

  // sheets
  const [openSheet, setOpenSheet] = useState<OpenSheet>("page"); // можно сразу страницу открыть как раньше
  const closeSheet = useCallback(() => setOpenSheet(null), []);
  const openTimeSheet = useCallback(() => setOpenSheet("time"), []);
  const openPageSheet = useCallback(() => setOpenSheet("page"), []);
  const openStatusSheet = useCallback(() => setOpenSheet("status"), []);
  const openDatePicker = useCallback(() => setOpenSheet("datePicker"), []);
  const openTimePicker = useCallback(() => setOpenSheet("timePicker"), []);

  const save = useCallback(async () => {
    if (!bookId) return;

    await sessionsRepo.create({
      id_book: bookId,
      time: durationSec,
      current_page: page,
      created_at: toSQLiteDateTimeFromDate(sessionDateTime),
    });

    // Если прочитаны все страницы — помечаем книгу как прочитанную и предлагаем пройти вопросы
    try {
      if (maxPages > 0 && page >= maxPages) {
        try {
          await booksRepo.update(bookId, { status_read: 1 } as any);
        } catch {
          // ignore
        }

        // get book title to pass to questions
        let bookTitle = "";
        try {
          const b = await booksRepo.getById(bookId);
          bookTitle = b?.name ?? "";
        } catch {}

        Alert.alert("Поздравляем!", "Книга прочитана. Хотите закрепить прочитанное 5-ю вопросами?", [
          { text: "Нет", style: "cancel", onPress: () => { closeSheet(); router.replace({ pathname: "/book", params: { id_book: String(bookId) } }); } },
            { text: "Да", onPress: () => { closeSheet(); router.push({ pathname: "/questions", params: { id_book: String(bookId), title: bookTitle } }); } },
        ]);
        return;
      }
    } catch (e) {
      // ignore
    }

        // ensure any open sheet is closed before navigating away
        closeSheet();
        router.replace({ pathname: "/book", params: { id_book: String(bookId) } });
  }, [bookId, durationSec, page, sessionDateTime, sessionsRepo, booksRepo, maxPages]);


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: "#FAF7F2" }} edges={["left", "right", "top", "bottom"]}>
        {/* Header (как на фото: назад + сохранить) */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()} className="h-10 w-10 rounded-full">
            <BackIcon width={24} height={24} color="#374151" />
          </Button>

          <Button
            onPress={save}
            className="h-11 flex-row items-center gap-2 rounded-full px-5"
            style={{ backgroundColor: "#FFFFFF" }}
          >
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

          <View className="mt-6 flex-row items-center gap-4">
            <Pressable onPress={openDatePicker} className="flex-row items-center">
              <Text className="text-base font-semibold" style={{ color: "#111827", textDecorationLine: "underline" }}>
                {formatDateRU(sessionDateTime)}
              </Text>
            </Pressable>

            <Pressable onPress={openTimePicker} className="flex-row items-center">
              <Text className="text-base font-semibold" style={{ color: "#111827", textDecorationLine: "underline" }}>
                {formatTimeRU(sessionDateTime)}
              </Text>
            </Pressable>
          </View>


          {/* блоки */}
          <View className="mt-6">
            <CardRow title="Вы читали" value={formatHMS(durationSec)} icon="⏱" onPress={openTimeSheet} />
            <CardRow title="Прочитано" value={`с. ${page} / ${maxPages}`} icon="🔖" onPress={openPageSheet} />
            <CardRow title="Положение дел" value={STATUS_LABEL[status]} icon="📖" onPress={openStatusSheet} />
          </View>
        </View>

        {/* Sheet: Время (часы/мин/сек) */}
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

            <Button
              className="mt-6 h-14 rounded-2xl"
              style={{ backgroundColor: "#3B6EA0" }}
              onPress={closeSheet}
            >
              <Text className="text-2xl font-semibold" style={{ color: "#FFFFFF" }}>
                ✓
              </Text>
            </Button>
          </SheetContent>
        </Sheet>

        {/* Sheet: Страница (wheel) */}
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
                onChange={setPage}
                highlightBg={"#EDE7FF"}
                highlightBorder={PURPLE_SOFT}
                textColor={"#111827"}
                mutedColor={TEXT_MUTED}
              />
            </View>

            <Button className="mt-6 h-14 rounded-2xl" style={{ backgroundColor: "#3B6EA0" }} onPress={closeSheet}>
              <Text className="text-2xl font-semibold" style={{ color: "#FFFFFF" }}>
                <CheckIcon/>
              </Text>
            </Button>
          </SheetContent>
        </Sheet>

        {/* Sheet: Статус */}
        <Sheet open={openSheet === "status"} onOpenChange={(v) => (v ? setOpenSheet("status") : closeSheet())}>
          <SheetContent snapPoints={["60%"]} style={{ backgroundColor: "#FAF7F2" }}>
            <View className="items-center">
              <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
                Положение дел
              </Text>
              <Text className="mt-1 text-base" style={{ color: TEXT_MUTED }}>
                Выберите статус книги
              </Text>
            </View>

            <View className="mt-6">
              {(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((key) => {
                const active = key === status;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      setStatus(key);
                      closeSheet();
                    }}
                    className="mb-3 rounded-2xl px-4 py-4"
                    style={{
                      backgroundColor: active ? PURPLE_SOFT : "#FFFFFF",
                      borderWidth: 1,
                      borderColor: active ? PURPLE : PURPLE_SOFT,
                    }}
                  >
                    <Text className="text-lg font-semibold" style={{ color: active ? PURPLE : "#111827" }}>
                      {STATUS_LABEL[key]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SheetContent>
        </Sheet>

        <Sheet
          open={openSheet === "datePicker"}
          onOpenChange={(v) => (v ? setOpenSheet("datePicker") : closeSheet())}
        >
          <SheetContent snapPoints={["55%"]} style={{ backgroundColor: "#FAF7F2" }}>
            <View className="items-center">
              <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
                Дата сеанса
              </Text>
            </View>

            <View className="mt-6 items-center">
              {openSheet === "datePicker" && (
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
              )}
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

        <Sheet
          open={openSheet === "timePicker"}
          onOpenChange={(v) => (v ? setOpenSheet("timePicker") : closeSheet())}
        >
          <SheetContent snapPoints={["55%"]} style={{ backgroundColor: "#FAF7F2" }}>
            <View className="items-center">
              <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
                Время сеанса
              </Text>
            </View>

            <View className="mt-6 items-center">
              {openSheet === "timePicker" && (
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
              )}
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
