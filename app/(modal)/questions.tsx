import BackIcon from "@/assets/icons/back.svg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useQuizzesRepository } from "@/src/features/quizzes/quizzes.repository";
import { useSessionsRepository } from "@/src/features/sessions/sessions.repository";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Params = { id_book?: string; title?: string };

type ApiQuestion = { q: string; options: string[]; answer_index: number };

export default function QuestionsScreen() {
  const params = useLocalSearchParams<Params>();
  const id_book = useMemo(() => Number(params.id_book ?? 0), [params.id_book]);
  const title = String(params.title ?? "");

  const quizzesRepo = useQuizzesRepository();
  const sessionsRepo = useSessionsRepository();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [lastResponse, setLastResponse] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noQuestionsForBook, setNoQuestionsForBook] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    // store start time in state via ref-like closure
    (globalThis as any).__questions_started_at = startedAt;

    let mounted = true;
    const getApiUrl = () => {
      // Use production/test domain to reach the server from device/emulator
      return "http://shady-vp.ru/generate";
    };

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const maxAttempts = 5;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const res = await fetch(getApiUrl(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
          });
          if (!res.ok) throw new Error(`status:${res.status}`);
          const json = await res.json();
          // store raw response for debugging
          setLastResponse(json);
          // server explicitly returned null -> no questions for this book
          if (json === null) {
            if (!mounted) return;
            setNoQuestionsForBook(true);
            setQuestions([]);
            setSelected([]);
            setLoading(false);
            return;
          }
          setNoQuestionsForBook(false);
          let qs: ApiQuestion[] = (json.questions ?? []).slice(0, 5).map((x: any) => ({ q: String(x.q ?? ""), options: x.options ?? [], answer_index: Number(x.answer_index ?? 0) }));
          // fallback: try to detect array at root
          if ((!qs || qs.length === 0) && Array.isArray(json)) {
            qs = (json as any[]).slice(0, 5).map((x: any) => ({ q: String(x.q ?? x.question ?? ""), options: x.options ?? [], answer_index: Number(x.answer_index ?? 0) }));
          }
          if (!mounted) return;
          setQuestions(qs);
          setSelected(Array(qs.length).fill(-1));
          setLoading(false);
          return;
        } catch (e: any) {
          // last attempt -> show error
          if (attempt === maxAttempts) {
            if (!mounted) return;
            setLoadError("Не удалось загрузить вопросы. Проверьте соединение и попробуйте снова.");
            setLoading(false);
            return;
          }
          // wait before retrying (exponential backoff)
          await new Promise((r) => setTimeout(r, attempt * 700));
        }
      }
    };

    void load();
    return () => { mounted = false; };
  }, [title, reloadKey]);

  const toggleSelect = (qi: number, oi: number) => {
    setSelected((prev) => {
      const copy = [...prev];
      copy[qi] = oi;
      return copy;
    });
  };

  const submit = async () => {
    const total = questions.length;
    let s = 0;
    const answers: any[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const sel = selected[i];
      if (sel === q.answer_index) s += 1;
      answers.push({ q: q.q, options: q.options, answer_index: q.answer_index, selected: sel });
    }
    setScore(s);
    setShowResult(true);

    try {
      await quizzesRepo.saveResult({ id_book, title, score: s, total, answers });
      // don't navigate here — show result and let user choose "Заново" или "Выйти"
    } catch (e) {
      // ignore save error
    }
  };

  const handleRetry = () => {
    // trigger reload of questions
    setShowResult(false);
    setScore(0);
    setSelected([]);
    setQuestions([]);
    setReloadKey((k) => k + 1);
  };

  const handleExit = async () => {
    // save session with duration since screen opened, then go to book
    try {
      const started = Number((globalThis as any).__questions_started_at ?? Date.now());
      const duration = Math.max(0, Math.floor((Date.now() - started) / 1000));
      await sessionsRepo.create({ id_book, time: duration, current_page: 0 });
    } catch (e) {
      // ignore session save errors
    }
    router.replace({ pathname: "/book", params: { id_book: String(id_book) } });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-lg font-semibold">Ошибка</Text>
          <Text className="mt-2 text-center text-sm" style={{ color: '#6B7280' }}>{loadError}</Text>
          <View className="mt-4 w-full">
            <Button onPress={() => {
              // retry by changing title dependency (re-run effect) — call load by toggling state
              setLoading(true);
              setLoadError(null);
              void (async () => { /* trigger useEffect by updating title? simply force reload by navigating here again */ router.replace({ pathname: '/questions', params: { id_book: String(id_book), title } }); })();
            }} className="h-12">
              <Text className="text-base font-semibold" style={{ color: '#FFFFFF' }}>Повторить</Text>
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }
  // prepare render content to avoid complex nested JSX/ternary
  let content: React.ReactNode = null;
  if (!showResult) {
    if (questions.length > 0) {
      content = questions.map((q, qi) => (
        <Card key={qi} className="mb-3 rounded-2xl bg-white px-4 py-4">
          <Text className="text-base font-semibold">{`Вопрос ${qi + 1}`}</Text>
          <Text className="mt-2 text-sm text-gray-600">{q.q}</Text>

          <View className="mt-3">
            {q.options.map((opt, oi) => {
              const active = selected[qi] === oi;
              return (
                <Pressable
                  key={oi}
                  onPress={() => toggleSelect(qi, oi)}
                  className="mb-2 rounded-xl px-3 py-2"
                  style={{ backgroundColor: active ? "#E6F4EA" : "#FFF", borderWidth: 1, borderColor: active ? "#34D399" : "#ECECEC" }}
                >
                  <Text style={{ color: "#111827" }}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ));
    } else {
      if (noQuestionsForBook) {
        content = (
          <Card className="mb-3 rounded-2xl bg-white px-4 py-4">
            <Text className="text-base font-semibold">К сожалению, у нас нет вопросов для этой книги</Text>
            <Text className="mt-2 text-sm" style={{ color: '#6B7280' }}>Попробуйте позже или выберите другую книгу.</Text>
          </Card>
        );
      } else {
        content = (
          <Card className="mb-3 rounded-2xl bg-white px-4 py-4">
            <Text className="text-base font-semibold">Вопросы не найдены</Text>
            <Text className="mt-2 text-sm" style={{ color: '#6B7280' }}>Сервер вернул пустой список вопросов.</Text>
            {lastResponse && (
              <View className="mt-3">
                <Text className="text-sm font-semibold">Ответ сервера (для отладки):</Text>
                <Text className="mt-2 text-xs" style={{ color: '#6B7280' }}>{JSON.stringify(lastResponse).slice(0, 1000)}</Text>
              </View>
            )}
          </Card>
        );
      }
    }
  } else {
    content = (
      <Card className="mb-3 rounded-2xl bg-white px-4 py-4">
        <Text className="text-2xl font-semibold">Результат: {score} / {questions.length}</Text>
        <View className="mt-4">
          {questions.map((q, i) => (
            <View key={i} className="mb-3">
              <Text className="font-semibold">{`Вопрос ${i + 1}`}</Text>
              <Text className="mt-1 text-sm text-gray-600">{q.q}</Text>
              <View className="mt-2">
                {q.options.map((opt, oi) => {
                  const correct = q.answer_index === oi;
                  const sel = selected[i] === oi;
                  return (
                    <View key={oi} className="mb-1 rounded-xl px-3 py-2" style={{ backgroundColor: correct ? "#E6F4EA" : sel ? "#FEF3C7" : "#FFF", borderWidth: 1, borderColor: correct ? "#34D399" : sel ? "#F59E0B" : "#ECECEC" }}>
                      <Text style={{ color: "#111827" }}>{opt}{correct ? " (правильно)" : sel ? " (ваш ответ)" : ""}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </Card>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full">
          <BackIcon width={24} height={24} color="#374151" />
        </Pressable>
        <Text className="text-xl font-semibold">Вопросы</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {content}
      </ScrollView>

      {!showResult ? (
        <View className="px-4 pb-6">
          <Button className="h-14" onPress={submit} disabled={selected.some((s) => s < 0)}>
            <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>Отправить</Text>
          </Button>
        </View>
      ) : (
        <View className="px-4 pb-6 flex-row gap-3">
          <Button variant="secondary" className="h-14 flex-1" onPress={handleRetry}>
            <Text className="text-base font-semibold" style={{ color: "#374151" }}>Заново</Text>
          </Button>

          <Button className="h-14 flex-1" onPress={handleExit}>
            <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>Выйти</Text>
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}
