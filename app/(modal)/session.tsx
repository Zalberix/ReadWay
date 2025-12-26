import BackIcon from "@/assets/icons/back.svg";
import CheckIcon from "@/assets/icons/check.svg";
import PauseIcon from "@/assets/icons/pause.svg";
import PlayIcon from "@/assets/icons/play.svg";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useBooksRepository, type BookRow } from "@/src/features/books/books.repository";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { clearInterval as _clearInterval, setInterval as _setInterval, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BG = "#F4F0FF";
const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const TEXT_MUTED = "#7C7790";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatHMS(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
}

export default function SessionModal() {
  const params = useLocalSearchParams<{ id_book?: string; page?: string }>();
  const bookId = useMemo(() => Number(params.id_book ?? 0), [params.id_book]);

  const booksRepo = useBooksRepository();
  const [book, setBook] = useState<BookRow | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!bookId) return;
      try {
        const b = await booksRepo.getById(bookId);
        if (mounted) setBook(b ?? null);
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [bookId, booksRepo]);

  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);

  useEffect(() => {
    let t: number | undefined;
    if (isRunning) {
      t = (_setInterval as any)(() => setSeconds((s) => s + 1), 1000) as unknown as number;
    }
    return () => { if (t) (_clearInterval as any)(t); };
  }, [isRunning]);

  const startSession = useCallback(() => {
    if (!sessionStart) setSessionStart(new Date());
    setIsRunning(true);
  }, [sessionStart]);

  const stopSession = useCallback(() => {
    setIsRunning(false);
  }, []);

  const onFinish = useCallback(() => {
    // navigate to save session screen with prefilled params
    router.push({ pathname: "/session-create", params: { id_book: String(bookId ?? 0), sessionDateISO: sessionStart ? sessionStart.toISOString() : new Date().toISOString(), durationSec: String(seconds) } });
  }, [bookId, sessionStart, seconds]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["left", "right", "top", "bottom"]}>
      {/* Top bar: back and optional finish (check) shown after pause */}
      <View style={{ position: "absolute", left: 16, top: 16, zIndex: 10, flexDirection: "row", alignItems: "center" }}>
        <Pressable onPress={() => router.back()} style={{ height: 40, width: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
          <BackIcon width={20} height={20} color="#374151" />
        </Pressable>

        {(!isRunning && seconds > 0) && (
          <Pressable onPress={onFinish} style={{ marginLeft: 12, height: 40, width: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
            <CheckIcon width={20} height={20} />
          </Pressable>
        )}
      </View>

      {/* Center: timer and play/pause */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text className="text-4xl font-semibold" style={{ color: "#111827", marginBottom: 16 }}>{formatHMS(seconds)}</Text>

        <Pressable onPress={isRunning ? stopSession : startSession} style={{ height: 120, width: 120, borderRadius: 60, backgroundColor: PURPLE_SOFT, alignItems: "center", justifyContent: "center" }}>
          {isRunning ? <PauseIcon width={40} height={40} color={PURPLE} /> : <PlayIcon width={40} height={40} color={PURPLE} />}
        </Pressable>
      </View>

      {/* Bottom: book block */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <Card className="rounded-2xl bg-white px-4 py-4">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text className="font-semibold" style={{ color: "#111827" }}>{book ? book.name : "Книга"}</Text>
              <Text className="text-sm" style={{ color: TEXT_MUTED, marginTop: 6 }}>{book ? `Страниц: ${book.page_count ?? 0}` : ""}</Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text className="text-sm" style={{ color: TEXT_MUTED }}>Время</Text>
              <Text className="font-semibold" style={{ color: "#111827", marginTop: 6 }}>{formatHMS(seconds)}</Text>
            </View>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}
