import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

import BackIcon from "@/assets/icons/back.svg";
import CheckIcon from "@/assets/icons/check.svg";

import { useGoalsRepository, type GoalRow } from "@/src/features/goals/goals.repository";

const BG = "#F4F0FF";
const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const INPUT_BG = "#F4F4F7";

type Params = { id?: string; returnTo?: string };

function SectionTitle({title}: {title: string}) {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <View className="h-4 w-10 rounded-md" style={{backgroundColor: PURPLE_SOFT}} />
      <Text className="text-lg font-semibold" style={{color: "#4B5563"}}>
        {title}
      </Text>
    </View>
  );
}

export default function GoalEditScreen() {
  const params = useLocalSearchParams<Params>();
  const returnTo = useMemo(() => {
    const v = params.returnTo;
    return typeof v === "string" && v.length > 0 ? v : undefined;
  }, [params.returnTo]);
  const goBack = () => {
    if (returnTo) router.replace({pathname: returnTo as any});
    else router.back();
  };

  const repo = useGoalsRepository();
  const id = Number(params.id ?? 0);

  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<GoalRow | null>(null);

  const [type, setType] = useState<"pages" | "time">("pages");
  const [target, setTarget] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      const g = await repo.getById(id);
      if (!mounted) return;
      setGoal(g);
      if (g) {
        setType(g.type);
        setTarget(String(g.target));
        setStartAt(g.start_at);
        setEndAt(g.end_at);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [id, repo]);

  const canSave = !saving && Number(target) > 0 && endAt.trim().length > 0;

  const onSave = async () => {
    if (!canSave || !id) return;
    setSaving(true);
    try {
      await repo.update(id, {type, target: Math.floor(Number(target)), start_at: startAt, end_at: endAt});
      goBack();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!id) return;
    Alert.alert("Удалить цель", "Вы уверены, что хотите удалить цель?", [
      {text: "Отмена", style: "cancel"},
      {text: "Удалить", style: "destructive", onPress: async () => {
        await repo.remove(id);
        goBack();
      }},
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1" style={{backgroundColor: BG}} edges={["left", "right", "bottom"]}>
        <View className="p-4">
          <Text>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{backgroundColor: BG}} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={goBack} className="h-10 w-10 items-center justify-center rounded-full">
          <BackIcon width={24} height={24} color="#374151" />
        </Pressable>

        <Text className="text-xl font-semibold" style={{color: "#111827"}}>
          Изменить цель
        </Text>

        <Pressable onPress={onSave} disabled={!canSave} className="h-10 w-10 items-center justify-center rounded-full" style={{opacity: canSave ? 1 : 0.4}}>
          <CheckIcon width={24} height={24} />
        </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} className="flex-1" contentContainerClassName="px-4 pb-28">
          <View className="flex-1 px-4 pb-28">
        <SectionTitle title="Тип цели" />
        <Card className="rounded-2xl bg-white px-4 py-4 mb-4">
          <View className="flex-row gap-2">
            <Pressable onPress={() => setType("pages")} className={`rounded-xl px-4 py-3 ${type === "pages" ? "bg-purple-100" : ""}`} style={{backgroundColor: type === "pages" ? PURPLE_SOFT : INPUT_BG}}>
              <Text className="font-medium">По страницам</Text>
            </Pressable>
            <Pressable onPress={() => setType("time")} className={`rounded-xl px-4 py-3 ${type === "time" ? "bg-purple-100" : ""}`} style={{backgroundColor: type === "time" ? PURPLE_SOFT : INPUT_BG}}>
              <Text className="font-medium">По времени</Text>
            </Pressable>
          </View>
        </Card>

        <SectionTitle title="Значение" />
        <Card className="rounded-2xl bg-white px-4 py-4 mb-4">
          <View>
            <Text className="text-sm text-gray-500">{type === "pages" ? "Количество страниц" : "Часов чтения"}</Text>
            <TextInput
              value={target}
              onChangeText={(v) => setTarget(v.replace(/[^0-9]/g, ""))}
              placeholder={type === "pages" ? "Например, 100" : "Например, 10"}
              keyboardType="number-pad"
              className="mt-2 rounded-xl px-4 py-3 text-base"
              style={{backgroundColor: INPUT_BG}}
            />
          </View>
        </Card>

        <SectionTitle title="Период" />
        <Card className="rounded-2xl bg-white px-4 py-4">
          <View>
            <Text className="text-sm text-gray-500">Дата начала (YYYY-MM-DD)</Text>
            <TextInput value={startAt} onChangeText={setStartAt} placeholder="2025-01-01" className="mt-2 rounded-xl px-4 py-3 text-base" style={{backgroundColor: INPUT_BG}} />

            <View className="mt-3">
              <Text className="text-sm text-gray-500">Дата окончания (YYYY-MM-DD)</Text>
              <TextInput value={endAt} onChangeText={setEndAt} placeholder="2025-02-01" className="mt-2 rounded-xl px-4 py-3 text-base" style={{backgroundColor: INPUT_BG}} />
            </View>

            <Pressable onPress={onDelete} className="mt-4 items-center justify-center">
              <Text className="text-red-600 font-semibold">Удалить цель</Text>
            </Pressable>
          </View>
        </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
