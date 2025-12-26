import BackIcon from "@/assets/icons/back.svg";
import CheckIcon from "@/assets/icons/check.svg";
import PauseIcon from "@/assets/icons/pause.svg";
import PlayIcon from "@/assets/icons/play.svg";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useSession } from "@/src/contexts/session";
import { useBooksRepository } from "@/src/features/books/books.repository";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
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

export default function SessionPage() {
  const params = useLocalSearchParams<{ id_book?: string; page?: string }>();
  const paramsBookId = useMemo(() => Number(params.id_book ?? 0), [params.id_book]);
  const paramsPage = useMemo(() => Number(params.page ?? 0), [params.page]);

  const booksRepo = useBooksRepository();
  const [book, setBook] = useState<any | null>(null);

  const session = useSession();

  // derive current book/page from session or params
  const currentBookId = session.bookId ?? (paramsBookId || null);
  const currentPage = session.page ?? (paramsPage || 0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const idToLoad = session.bookId ?? (paramsBookId || 0);
      if (!idToLoad) return;
      try {
        const b = await booksRepo.getById(idToLoad);
        if (mounted) setBook(b ?? null);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [session.bookId, paramsBookId, booksRepo]);

  const isRunning = session.isRunning;
  const seconds = session.seconds;

  const start = useCallback(() => {
    // start session using either session.bookId or params
    if (session.bookId) session.start(session.bookId, session.page ?? paramsPage);
    else if (paramsBookId) session.start(paramsBookId, paramsPage);
    else session.start(0, paramsPage);
  }, [session, paramsBookId, paramsPage]);

  const pause = useCallback(() => session.pause(), [session]);

  const onFinish = useCallback(() => {
    const data = session.finish();
    const maxPages = book?.page_count ?? 0;
    router.push({ pathname: "/session-create", params: { id_book: String(data.bookId ?? ""), page: String(data.page ?? 0), max: String(maxPages), durationSec: String(data.duration), sessionDateISO: data.startDateISO } });
  }, [session, book]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["left","right","top","bottom"]}>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.back()} style={{ height: 40, width: 40, alignItems: 'center', justifyContent: 'center' }}>
          <BackIcon width={20} height={20} color="#374151" />
        </Pressable>

        <Text className="text-lg font-semibold" style={{ color: '#111827' }}>Сеанс</Text>

        {/* finish button on the right when paused or stopped after some time */}
        <View style={{ width: 40, height: 40 }}>
          {!isRunning && seconds > 0 && (
            <Pressable onPress={onFinish} style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon width={18} height={18} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text className="text-3xl font-semibold" style={{ color: '#111827', marginBottom: 16 }}>{formatHMS(seconds)}</Text>

        <Pressable onPress={() => (isRunning ? pause() : start())} style={{ height: 120, width: 120, borderRadius: 60, backgroundColor: PURPLE_SOFT, alignItems: 'center', justifyContent: 'center' }}>
          {isRunning ? <PauseIcon width={40} height={40} color={PURPLE} /> : <PlayIcon width={40} height={40} color={PURPLE} />}
        </Pressable>
      </View>

      <View style={{ padding: 16 }}>
        <Card className="rounded-2xl bg-white px-4 py-3">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#F0EEF8' }} />
            <View style={{ flex: 1 }}>
              <Text className="font-semibold" style={{ color: '#111827' }}>{book?.name ?? 'Название книги'}</Text>
              <Text className="text-sm" style={{ color: TEXT_MUTED, marginTop: 6 }}>{currentPage} / {book?.page_count ?? 0} стр.</Text>
            </View>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}
