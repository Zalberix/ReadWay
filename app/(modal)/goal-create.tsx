import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Reusables
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

import BackIcon from "@/assets/icons/back.svg";
import CheckIcon from "@/assets/icons/check.svg";

import { useGoalsRepository } from "@/src/features/goals/goals.repository";

const BG = "#F4F0FF";
const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const INPUT_BG = "#F4F4F7";

type Params = { returnTo?: string };

function SectionTitle({ title }: { title: string }) {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <View className="h-4 w-10 rounded-md" style={{ backgroundColor: PURPLE_SOFT }} />
      <Text className="text-lg font-semibold" style={{ color: "#4B5563" }}>
        {title}
      </Text>
    </View>
  );
}

export default function GoalCreateScreen() {
  const params = useLocalSearchParams<Params>();
  const returnTo = useMemo(() => {
    const v = params.returnTo;
    return typeof v === "string" && v.length > 0 ? v : undefined;
  }, [params.returnTo]);
  const goBack = () => {
    if (returnTo) router.replace({ pathname: returnTo as any });
    else router.back();
  };

  const repo = useGoalsRepository();

  function todayKey() {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  const [type, setType] = useState<"pages" | "time">("pages");
  const [target, setTarget] = useState("");
  const [startAt, setStartAt] = useState<string>(todayKey());
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = !saving && Number(target) > 0 && endAt.trim().length > 0;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await repo.create({ type, target: Math.floor(Number(target)), start_at: startAt || undefined, end_at: endAt });
      goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: BG }} edges={["left", "right", "bottom"]}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={goBack} className="h-10 w-10 items-center justify-center rounded-full">
          <BackIcon width={24} height={24} color="#374151" />
        </Pressable>

        <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
          Новая цель
        </Text>

        <Pressable onPress={onSave} disabled={!canSave} className="h-10 w-10 items-center justify-center rounded-full" style={{ opacity: canSave ? 1 : 0.4 }}>
          <CheckIcon width={24} height={24} />
        </Pressable>
      </View>

      <View className="flex-1 px-4 pb-28">
        <SectionTitle title="Тип цели" />
        <Card className="rounded-2xl bg-white px-4 py-4 mb-4">
          <View className="flex-row gap-2">
            <Pressable onPress={() => setType("pages")} className={`rounded-xl px-4 py-3 ${type === "pages" ? "bg-purple-100" : ""}`} style={{ backgroundColor: type === "pages" ? PURPLE_SOFT : INPUT_BG }}>
              <Text className="font-medium">По страницам</Text>
            </Pressable>
            <Pressable onPress={() => setType("time")} className={`rounded-xl px-4 py-3 ${type === "time" ? "bg-purple-100" : ""}`} style={{ backgroundColor: type === "time" ? PURPLE_SOFT : INPUT_BG }}>
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
              style={{ backgroundColor: INPUT_BG }}
            />
          </View>
        </Card>

        <SectionTitle title="Период" />
        <Card className="rounded-2xl bg-white px-4 py-4">
          <View>
            <Text className="text-sm text-gray-500">Дата начала (YYYY-MM-DD) — опционально</Text>
            <TextInput value={startAt} onChangeText={setStartAt} placeholder="2025-01-01" className="mt-2 rounded-xl px-4 py-3 text-base" style={{ backgroundColor: INPUT_BG }} />

            <View className="mt-3">
              <Text className="text-sm text-gray-500">Дата окончания (YYYY-MM-DD)</Text>
              <TextInput value={endAt} onChangeText={setEndAt} placeholder="2025-02-01" className="mt-2 rounded-xl px-4 py-3 text-base" style={{ backgroundColor: INPUT_BG }} />
            </View>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}
