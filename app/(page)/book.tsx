import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, View, InteractionManager, Keyboard, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

import BackIcon from "@/assets/icons/back.svg";
import PlaceholderIcon from "@/assets/icons/book-placeholder.svg";
import ChevronRightIcon from "@/assets/icons/chevron-right.svg";
import PauseIcon from "@/assets/icons/pause.svg";
import PencilIcon from "@/assets/icons/pencil.svg";
import PlayIcon from "@/assets/icons/play.svg";
import PlusIcon from "@/assets/icons/plus.svg";
import TrashIcon from "@/assets/icons/trash.svg";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSession } from "@/src/contexts/session";
import { useBooksRepository } from "@/src/features/books/books.repository";
import { useNotesRepository, type NoteRow } from "@/src/features/notes/notes.repository";
import { useQuizzesRepository, type QuizResultRow } from "@/src/features/quizzes/quizzes.repository";
import { useSessionsRepository, type SessionRow } from "@/src/features/sessions/sessions.repository";
import { useFocusEffect } from "@react-navigation/native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const BG = "#F4F0FF";
const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const TEXT_MUTED = "#7C7790";

const THUMB_BG = "#E9E4F4";

type BookRow = {
  id_book: number;
  cover_path: string | null;
  name: string;
  description: string | null;
  ISBN: string | null;
  page_count: number;
  publisher_name: string | null;
  year_of_publication: number | null;
  month_of_publication: number | null;
  day_of_publication: number | null;
  created_at: string;
};

function formatDateTime(sqliteDate: string) {
  // sqliteDate: "YYYY-MM-DD HH:MM:SS"
  const d = new Date(sqliteDate.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return sqliteDate;

  const pad = (n: number) => String(n).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${yy} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMinutes(seconds: number) {
  const m = Math.floor(seconds / 60);
  if (m <= 0) return "меньше минуты";
  if (m === 1) return "1 минута";
  if (m >= 2 && m <= 4) return `${m} минуты`;
  return `${m} минут`;
}

function formatHMS(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function BookThumb({ uri, size = 56 }: { uri?: string | null; size?: number }) {
  const s = size ?? 64;
  const hasImage = typeof uri === "string" && uri.trim().length > 0;

  if (!hasImage) {
    return (
      <View className="overflow-hidden rounded-xl" style={{ width: s, height: s, backgroundColor: THUMB_BG }}>
        <PlaceholderIcon width={s} height={s} />
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-xl" style={{ width: s, height: s, backgroundColor: THUMB_BG }}>
      <Image source={{ uri: uri! }} style={{ width: s, height: s }} resizeMode="cover" />
    </View>
  );
}

function ProgressLine({
                        value,
                        max,
                        onEdit,
                      }: {
  value: number;
  max: number;
  onEdit?: () => void;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));

  return (
    <View className="mt-2">
      <View className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: PURPLE_SOFT }}>
        <View className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: PURPLE }} />
      </View>

      <Pressable
        onPress={onEdit}
        className="mt-2 flex-row  items-center justify-center"
      >
      <Text className="text-sm font-medium" style={{ color: "#4B5563" }}>
        <Text className="text-base font-bold" style={{ color: TEXT_MUTED }}>{value}</Text>
        {" "} / {max} {" стр."}
      </Text>
      <PencilIcon width="20" className="text-base font-semibold" fill="#4B5563"/>
      </Pressable>
    </View>
  );
}


function genCode() {
  // 4-значный код
  return String(Math.floor(1000 + Math.random() * 9000));
}


export function DeleteBookSheet({
                                  open,
                                  onConfirm,
                                  onOpenChange,
                                }: {
  open: boolean;
  onConfirm: () => Promise<void> | void;
  onOpenChange: (v: boolean) => void;
}) {
  const [code, setCode] = useState(() => genCode());
  const [typed, setTyped] = useState("");

  const inputRef = useRef<TextInput>(null);

  const canDelete = useMemo(() => typed.trim() === code, [typed, code]);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      inputRef.current?.blur();
      Keyboard.dismiss();
    }
    onOpenChange(v);
  };

  // при каждом открытии — новый код, чистим ввод и фокусируем поле
  useEffect(() => {
    if (!open) return;

    setCode(genCode());
    setTyped("");

    // дождаться анимации открытия Sheet, чтобы фокус стабильно сработал
    const task = InteractionManager.runAfterInteractions(() => {
      inputRef.current?.focus();
    });

    return () => task.cancel?.();
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent snapPoints={["78%"]} style={{ backgroundColor: "#FAF7F2" }}>
        <View className="items-center">
          <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
            Удалить книгу?
          </Text>
        </View>

        <View className="mt-4">
          <Text className="text-base" style={{ color: TEXT_MUTED }}>
            Книга будет удалена вместе с заметками и сеансами.
          </Text>
          <Text className="mt-1 text-base font-bold" style={{ color: "#111827" }}>
            Действие нельзя отменить.
          </Text>
        </View>

        <View className="mt-5">
          <Text className="text-sm font-semibold" style={{ color: TEXT_MUTED }}>
            Для подтверждения введите число:
          </Text>

          <View
            className="mt-2 flex-row items-center justify-between rounded-2xl px-4 py-3"
            style={{ backgroundColor: BG }}
          >
            <Text className="text-xl font-bold" style={{ color: PURPLE }}>
              {code}
            </Text>

            <Pressable
              onPress={() => {
                setCode(genCode());
                setTyped("");
                // чтобы после "Сменить" сразу снова был фокус
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: PURPLE_SOFT }}
            >
              <Text className="text-sm font-semibold" style={{ color: PURPLE }}>
                Сменить
              </Text>
            </Pressable>
          </View>

          <Input
            ref={inputRef}
            value={typed}
            onChangeText={(v) => setTyped(v.replace(/[^\d]/g, "").slice(0, 6))}
            placeholder="Введите число"
            keyboardType="number-pad"
            className="mt-3"
            // если ваш Input прокидывает эти пропсы — добавь:
            // blurOnSubmit={false}
            // autoCorrect={false}
          />
        </View>

        <View className="mt-6 flex-row gap-3">
          <Button
            variant="secondary"
            className="h-14 flex-1 rounded-2xl"
            style={{ backgroundColor: PURPLE_SOFT }}
            onPress={() => handleOpenChange(false)}
          >
            <Text className="text-base font-semibold" style={{ color: PURPLE }}>
              Отмена
            </Text>
          </Button>

          <Button
            className="h-14 flex-1 rounded-2xl"
            style={{ backgroundColor: canDelete ? "#3B6EA0" : "#C9D7E6" }}
            disabled={!canDelete}
            onPress={async () => {
              if (!canDelete) return;

              // закрыть клавиатуру сразу, чтобы не мешала анимации/закрытию
              inputRef.current?.blur();
              Keyboard.dismiss();

              await onConfirm();
              handleOpenChange(false);
            }}
          >
            <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>
              Удалить
            </Text>
          </Button>
        </View>
      </SheetContent>
    </Sheet>
  );
}


export default function BookScreen() {
  const db = useSQLiteContext();
  const notesRepo = useNotesRepository();
  const sessionsRepo = useSessionsRepository();
  const quizzesRepo = useQuizzesRepository();

  const params = useLocalSearchParams<{ id_book?: string }>();
  const bookId = useMemo(() => {
    const n = Number(params.id_book);
    return Number.isFinite(n) ? n : 0;
  }, [params.id_book]);

  const [book, setBook] = useState<BookRow | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [lastQuiz, setLastQuiz] = useState<QuizResultRow | null>(null);
  const lastSession = sessions[0] ?? null;
  const prevSession = sessions[1] ?? null;

  const lastDelta = useMemo(() => {
    if (!lastSession) return 0;
    const cur = Number(lastSession.current_page ?? 0);
    const prev = Number(prevSession?.current_page ?? 0);
    return cur - prev;
  }, [lastSession, prevSession]);
  const lastDeltaLabel = lastDelta >= 1 ? ` (+${lastDelta})` : "";

  const [currentPage, setCurrentPage] = useState<number>(0);

  // session timer
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<any>(null);

  const loadAll = useCallback(async () => {
    if (!bookId) return;

    const b = await db.getFirstAsync<BookRow>(
      `SELECT
         id_book, cover_path, name, description, ISBN, page_count, publisher_name,
         year_of_publication, month_of_publication, day_of_publication, created_at
       FROM books
       WHERE id_book = ?`,
      [bookId],
    );

    const n = await notesRepo.listByBook(bookId);
    const s = await sessionsRepo.listByBook(bookId, 10);

    setBook(b ?? null);
    setNotes(n);
    setSessions(s);
    try {
      const q = await quizzesRepo.listByBook(bookId, 1);
      setLastQuiz(q[0] ?? null);
    } catch (e) {
      setLastQuiz(null);
    }

    const pageFromLast = s[0]?.current_page ?? 0;
    setCurrentPage(pageFromLast);
  }, [bookId, db, notesRepo, sessionsRepo]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll]),
  );

  const booksRepo = useBooksRepository();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const session = useSession();

  // session modal (opened when Play pressed)
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [modalIsRunning, setModalIsRunning] = useState(false);
  const modalStartedAtRef = useRef<number | null>(null);
  const [modalElapsedSec, setModalElapsedSec] = useState(0);
  const modalTickRef = useRef<any>(null);

  const onDeleteBook = useCallback(async () => {
    if (!bookId) return;
    await booksRepo.deleteBook(bookId);
    setDeleteOpen(false);
    router.back(); // или loadAll() + остаёмся на экране
  }, [bookId, booksRepo]);

  // timer loop
  useEffect(() => {
    if (!isRunning) return;

    tickRef.current = setInterval(() => {
      const start = startedAtRef.current;
      if (!start) return;
      setElapsedSec(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 500);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [isRunning]);

  // modal timer loop
  useEffect(() => {
    if (!sessionModalOpen) {
      if (modalTickRef.current) {
        clearInterval(modalTickRef.current);
        modalTickRef.current = null;
      }
      return;
    }

    if (!modalIsRunning) return;

    modalTickRef.current = setInterval(() => {
      const start = modalStartedAtRef.current;
      if (!start) return;
      setModalElapsedSec(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 500);

    return () => {
      if (modalTickRef.current) clearInterval(modalTickRef.current);
      modalTickRef.current = null;
    };
  }, [sessionModalOpen, modalIsRunning]);

  const startSession = useCallback(() => {
    startedAtRef.current = Date.now();
    setElapsedSec(0);
    setIsRunning(true);
  }, []);

  const stopSession = useCallback(async () => {
    const start = startedAtRef.current;
    startedAtRef.current = null;
    setIsRunning(false);

    const duration = start ? Math.max(0, Math.floor((Date.now() - start) / 1000)) : elapsedSec;
    if (!bookId) return;

    // сохраняем сеанс
    await sessionsRepo.create({
      id_book: bookId,
      time: duration,
      current_page: currentPage,
    });

    await loadAll();
  }, [bookId, currentPage, elapsedSec, loadAll, sessionsRepo]);

  const totalPages = book?.page_count ?? 0;

  const goCreateNote = useCallback(() => {
    router.push({
      pathname: "/note-create",
      params: { id_book: String(bookId), returnTo: "/book" },
    });
  }, [bookId]);

  const goEditNote = useCallback((id_note: number) => {
    router.push({
      pathname: "/note-edit",
      params: { id_note: String(id_note), id_book: String(bookId), returnTo: "/book" },
    });
  }, [bookId]);

  const goCreateSession = useCallback(() => {
    router.push({
      pathname: "/session-create",
      params: {
        id_book: String(bookId),
        page: String(currentPage),
        max: String(totalPages),
      },
    });
  }, [bookId, currentPage, totalPages]);

  const onFinishFromModal = useCallback(() => {
    const duration = modalElapsedSec;
    const startDate = new Date(Date.now() - duration * 1000);

    // stop modal timer and close
    setSessionModalOpen(false);
    setModalIsRunning(false);
    modalStartedAtRef.current = null;
    if (modalTickRef.current) {
      clearInterval(modalTickRef.current);
      modalTickRef.current = null;
    }

    router.push({
      pathname: "/session-create",
      params: {
        id_book: String(bookId),
        page: String(currentPage),
        max: String(totalPages),
        durationSec: String(duration),
        sessionDateISO: startDate.toISOString(),
      },
    });
  }, [bookId, currentPage, totalPages, modalElapsedSec]);

  const goAllSessions = useCallback(() => {
    router.push({
      pathname: "/book-sessions",
      params: { id_book: String(bookId) },
    });
  }, [bookId]);

  const goEditLastSession = useCallback(() => {
    if (!lastSession) return;

    router.push({
      pathname: "/session-edit",
      params: {
        id: String(lastSession.id),
        id_book: String(bookId),
        max: String(totalPages),
      },
    });
  }, [bookId, lastSession, totalPages]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: BG }} edges={["left", "right", "top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full" onPress={() => router.back()}>
          <BackIcon width={24} height={24} color="#374151" />
        </Pressable>

        <Text className="text-3xl font-semibold" style={{ color: "#111827" }}>

        </Text>

        {/* spacer */}
        <View className="h-10 w-10" />
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={16}
      >
        {/* Book main card */}
        <View className="mb-4 flex-row gap-1.5">
          {/* LEFT: твоя карточка как есть */}
          <Card className="flex-1 rounded-2xl bg-white px-4 py-4">
            <View className="flex-row items-center gap-2">
              <BookThumb uri={book?.cover_path ?? null} size={64} />

              <View className="flex-1">
                <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
                  {book?.name ?? "Книга"}
                </Text>

                <View className="mt-2 flex-row items-center justify-between">
                  <View className="mt-2 flex-col justify-between">
                    <Text className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>
                      {book?.created_at ? `От ${formatDateTime(book.created_at).slice(0, 8)}` : ""}
                    </Text>

                    <View className="mt-2 flex-row items-center justify-between">
                      <Pressable className="flex-row items-center gap-1" onPress={goCreateNote}>
                        <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                          Заметок: {notes.length}
                        </Text>
                        <PlusIcon width={16} height={16} color={PURPLE} />
                      </Pressable>
                    </View>
                  </View>

                  <Pressable
                    className="flex h-20 w-20 items-center justify-center rounded-full"
                    style={{ backgroundColor: PURPLE_SOFT }}
                    onPress={() => {
                      if (bookId) session.start(bookId, currentPage);
                      router.push({ pathname: '/session', params: { id_book: String(bookId), page: String(currentPage) } });
                    }}
                  >
                    {session.isRunning && session.bookId === bookId ? (
                      <PauseIcon width={28} height={28} color={PURPLE} />
                    ) : (
                      <PlayIcon color={PURPLE} />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>

            <View className="mt-3">
              <ProgressLine
                value={currentPage}
                max={totalPages}
                onEdit={() =>
                  router.push({
                    pathname: "/session-create",
                    params: {
                      id_book: String(bookId),
                      page: String(currentPage),
                      max: String(totalPages),
                    },
                  })
                }
              />

              {session.isRunning && session.bookId === bookId && (
                <View className="mt-3 items-center justify-center">
                  <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                    Сеанс идёт: {formatMinutes(session.seconds)}
                  </Text>
                </View>
              )}

              {lastQuiz && (
                <View className="mt-3 items-center justify-center">
                  <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                    Опрос: {lastQuiz.score} / {lastQuiz.total}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          {/* RIGHT: блок кнопок ВНЕ card */}
          <View className="gap-1.5" style={{ width: 40 }}>

            <View className="rounded-2xl bg-white" style={{ width: 40, height: 40, padding: 0 }}>
              <Pressable
                onPress={() => setDeleteOpen(true)}
                style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
              >
                <TrashIcon width={20} height={20} color={PURPLE} />
              </Pressable>
            </View>
            <View className="flex-1 rounded-2xl bg-white" style={{ width: 40, padding: 0 }}>
              <Pressable
                onPress={() =>{
                  router.push({
                    pathname: "/book-edit",
                    params: { id_book: String(bookId), returnTo: "/book" },
                  })
                }}
                className="flex-1 items-center justify-center"
              >
                <PencilIcon className="items-center justify-center" width={20} height={20} color={PURPLE} />
              </Pressable>
            </View>
          </View>

        </View>

        {/* Sessions */}
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable className="flex-row items-center gap-2" onPress={goAllSessions}>
            <View className="h-4 w-1 rounded-full" style={{ backgroundColor: PURPLE_SOFT }} />
            <Text className="text-lg font-semibold" style={{ color: "#6B677A" }}>
              Сессии
            </Text>
            <ChevronRightIcon width={18} height={18} color="#6B677A" />
          </Pressable>

          {lastSession !== null && (
            <Pressable className="flex-row items-center gap-2" onPress={goCreateSession}>
              <Text className="text-lg font-semibold" style={{ color: "#6B677A" }}>
                Добавить
              </Text>
              <Text className="text-xl font-semibold" style={{ color: PURPLE }}>
                <PlusIcon width={18} height={18} color={PURPLE}/>
              </Text>
            </Pressable>
          )}
        </View>

        {/* Last session card */}
        {lastSession !== null ? (
        <Card className="mb-6 rounded-2xl bg-white px-4 py-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-semibold" style={{ color: "#111827" }}>
              Последний сеанс
            </Text>

            <Text className="text-sm" style={{ color: TEXT_MUTED }}>
              {lastSession ? formatDateTime(lastSession.created_at) : ""}
            </Text>
          </View>

          <Text className="mt-3 text-3xl font-semibold" style={{ color: "#111827" }}>
            {lastSession ? formatMinutes(lastSession.time) : "Нет данных"}
          </Text>

          <View className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: PURPLE_SOFT }}>
            <View
              className="h-full rounded-full"
              style={{
                width:
                  totalPages > 0 && lastSession
                    ? `${Math.max(0, Math.min(1, lastSession.current_page / totalPages)) * 100}%`
                    : "0%",
                backgroundColor: PURPLE,
              }}
            />
          </View>

          {/* кликабельные цифры + карандаш */}
          <Pressable onPress={goEditLastSession} className="mt-3 flex-row items-center justify-center gap-2">
            <Text className="text-2xl font-semibold" style={{ color: TEXT_MUTED }}>
              {lastSession ? `${lastSession.current_page} / ${totalPages} стр.` : `0 / ${totalPages} стр.`}
              {lastSession ? lastDeltaLabel : ""}
            </Text>

            {/* твой PencilIcon */}
            <PencilIcon width={18} height={18} color={PURPLE} />
          </Pressable>
        </Card>
        ) : (
          <View className="flex mb-6">
            <Pressable className="flex-row items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4" onPress={goCreateSession}>
              <Text className="text-lg font-semibold" style={{ color: "#6B677A" }}>
                Добавить
              </Text>
              <Text className="text-xl font-semibold" style={{ color: PURPLE }}>
                <PlusIcon width={18} height={18} color={PURPLE}/>
              </Text>
            </Pressable>
          </View>
        )}

        {/* Notes */}
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-lg font-semibold" style={{ color: "#6B677A" }}>
            Заметки
          </Text>

          {notes.length !== 0 && (
            <Pressable onPress={goCreateNote} className="flex-row items-center gap-2">
              <Text className="text-sm font-semibold" style={{ color: "#6B677A" }}>
                Добавить
              </Text>
              <Text className="text-lg font-semibold" style={{ color: PURPLE }}>
                <PlusIcon width={18} height={18} color={PURPLE}/>
              </Text>
            </Pressable>
          )}
        </View>

        {notes.length === 0 ? (
          <View className="flex mb-6">
            <Pressable className="flex-row items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4" onPress={goCreateNote}>
              <Text className="text-lg font-semibold" style={{ color: "#6B677A" }}>
                Добавить
              </Text>
              <Text className="text-xl font-semibold" style={{ color: PURPLE }}>
                <PlusIcon width={18} height={18} color={PURPLE}/>
              </Text>
            </Pressable>
          </View>
        ) : (
          <Card className="rounded-2xl bg-white px-4 py-4">
            {notes.map((n, idx) => (
              <Pressable key={`${n.id_note}-${idx}`} onPress={() => goEditNote(n.id_note)} className="py-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold" style={{ color: "#111827" }}>
                    Заметка
                  </Text>
                  <Text className="text-xs" style={{ color: TEXT_MUTED }}>
                    {formatDateTime(n.created_at)}
                  </Text>
                </View>

                <Text className="mt-2 text-base" style={{ color: "#111827" }}>
                  {n.text}
                </Text>

                {idx !== notes.length - 1 && <View className="mt-4 h-px" style={{ backgroundColor: PURPLE_SOFT }} />}
              </Pressable>
            ))}
          </Card>
        )}
      </KeyboardAwareScrollView>
      {/* Session is now a separate page at /session */}

      <DeleteBookSheet
        open={deleteOpen}
        onOpenChange={(v) => (v ? setDeleteOpen(true) : setDeleteOpen(false))}
        onConfirm={onDeleteBook}
      />
    </SafeAreaView>
  );
}
