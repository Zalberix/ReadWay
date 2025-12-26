import BackIcon from "@/assets/icons/back.svg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useQuizzesRepository } from "@/src/features/quizzes/quizzes.repository";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Params = { id_book?: string; title?: string };

type ApiQuestion = { q: string; options: string[]; answer_index: number };

export default function QuestionsScreen() {
  const params = useLocalSearchParams<Params>();
  const id_book = useMemo(() => Number(params.id_book ?? 0), [params.id_book]);
  const title = String(params.title ?? "");

  const quizzesRepo = useQuizzesRepository();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        const json = await res.json();
        const qs: ApiQuestion[] = (json.questions ?? []).slice(0, 5).map((x: any) => ({ q: String(x.q ?? ""), options: x.options ?? [], answer_index: Number(x.answer_index ?? 0) }));
        if (!mounted) return;
        setQuestions(qs);
        setSelected(Array(qs.length).fill(-1));
      } catch (e) {
        Alert.alert("Ошибка", "Не удалось загрузить вопросы");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [title]);

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
    } catch (e) {
      // ignore save error
    }
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
        {!showResult ? (
          questions.map((q, qi) => (
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
          ))
        ) : (
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
        )}
      </ScrollView>

      {!showResult ? (
        <View className="px-4 pb-6">
          <Button className="h-14" onPress={submit} disabled={selected.some((s) => s < 0)}>
            <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>Отправить</Text>
          </Button>
        </View>
      ) : (
        <View className="px-4 pb-6">
          <Button className="h-14" onPress={() => router.back()}>
            <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>Готово</Text>
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}
