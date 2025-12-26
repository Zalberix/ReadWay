// app/(tabs)/goal.tsx
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

// Reusables (пути поправь под свой шаблон, если отличаются)
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

// Иконки из assets/icons (названия любые — потом заменишь)
import BackIcon from "@/assets/icons/back.svg";
import CheckIcon from "@/assets/icons/check.svg";
import PlusIcon from "@/assets/icons/plus.svg";
import { useGoalsRepository, type GoalRow } from "@/src/features/goals/goals.repository";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const BG = "#F4F0FF";
const TEXT_MUTED = "#7C7790";

type Params = {
  returnTo?: string;
};

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

function CircleProgress({
                          percent,
                          size = 56,
                          strokeWidth = 6,
                          status = "normal",
                        }: {
  percent: number; // 0..100
  size?: number;
  strokeWidth?: number;
  status?: "normal" | "completed" | "failed";
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, percent)) / 100;
  const dash = c * (1 - v);

  if (status === "completed") {
    return (
      <View className="items-center justify-center">
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="#16A34A" strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <View className="absolute items-center justify-center">
          <CheckIcon width={24} height={24} />
        </View>
      </View>
    );
  }

  if (status === "failed") {
    return (
      <View className="items-center justify-center">
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="#DC2626" strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <View className="absolute items-center justify-center">
          <Text className="text-2xl font-bold" style={{ color: "#DC2626" }}>
            ✕
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={PURPLE_SOFT}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={PURPLE}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dash}
          strokeLinecap="round"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>

      <View className="absolute items-center justify-center">
        <Text className="text-base font-semibold" style={{ color: "#111827" }}>
          {Math.round(v * 100)}%
        </Text>
      </View>
    </View>
  );
}

type GoalCardProps = {
  percent: number;
  subtitle: string;
  title: string;
  onPress?: () => void;
  status?: "normal" | "completed" | "failed";
};

function GoalCard({ percent, subtitle, title, onPress, status = "normal" }: GoalCardProps) {
  const content = (
    <Card className="mb-4 rounded-2xl bg-white px-4 py-4">
      <View className="flex-row items-center gap-4">
        <CircleProgress percent={percent} status={status} />

        <View className="flex-1">
          <Text className="text-sm" style={{ color: TEXT_MUTED }}>
            {subtitle}
          </Text>
          <Text className="mt-1 text-lg font-semibold" style={{ color: "#111827" }}>
            {title}
          </Text>
        </View>
      </View>
    </Card>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

export default function GoalScreen() {
  // TODO сделать нормальное скрытие кнопки

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
  const [activeGoals, setActiveGoals] = useState<GoalRow[]>([]);
  const [historyGoals, setHistoryGoals] = useState<GoalRow[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, { done: number; target: number }>>({});

  const load = useCallback(async () => {
    try {
      const active = await repo.listActive();

      // Автоматически помечаем выполненные цели как completed
      const toComplete: number[] = [];
      for (const g of active ?? []) {
        try {
          const p = await repo.getProgress(g.id);
          if (p && p.done >= p.target) toComplete.push(g.id);
        } catch {}
      }

      if (toComplete.length > 0) {
        for (const id of toComplete) {
          try {
            await repo.complete(id);
          } catch {}
        }
        // after marking completed, refresh lists
      }

      const refreshedActive = await repo.listActive();
      const hist = await repo.listHistory();
      setActiveGoals(refreshedActive ?? []);
      setHistoryGoals(hist ?? []);

      const map: Record<number, { done: number; target: number }> = {};
      const goalsForProgress = [...(refreshedActive ?? []), ...(hist ?? [])];
      for (const g of goalsForProgress) {
        try {
          const p = await repo.getProgress(g.id);
          if (p) map[g.id] = p;
        } catch {}
      }
      setProgressMap(map);
    } catch (e) {
      setActiveGoals([]);
      setHistoryGoals([]);
      setProgressMap({});
    }
  }, [repo]);

  useFocusEffect(
    useMemo(() => {
      void load();
      return () => {};
    }, [load]),
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: BG }} edges={["left", "right", "top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        {returnTo !== undefined ? (
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={goBack}
            >
              <BackIcon width={24} height={24} color="#374151" />
            </Pressable>
        ) : (
            <View className="p-10px"></View>
        )}


        <Text className="text-4xl font-semibold" style={{ color: "#111827" }}>
          Цель
        </Text>

        <Pressable className="h-10 w-10 items-center justify-center rounded-full" onPress={() => router.push({ pathname: "/goal-create", params: { returnTo: "/goal" } })}>
          <PlusIcon width={24} height={24} color="#374151" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28"
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle title="Активные цели" />
        {/* Active goals */}
        {activeGoals.length === 0 ? (
          <Text className="text-sm text-gray-500">Пока нет активных целей</Text>
        ) : (
          activeGoals.map((g) => {
            const p = progressMap[g.id];
            const percent = p ? Math.round((p.done / Math.max(1, p.target)) * 100) : 0;
            const subtitle = `${g.start_at} — ${g.end_at}`;
            const title = g.type === "pages" ? `${p ? p.done : 0} / ${g.target} стр.` : `${p ? Math.round((p.done / 3600) * 10) / 10 : 0} / ${g.target} ч`;

            return (
              <GoalCard
                key={g.id}
                percent={percent}
                subtitle={subtitle}
                title={title}
                onPress={() => router.push({ pathname: "/goal-edit", params: { id: String(g.id), returnTo: "/goal" } })}
              />
            );
          })
        )}

        <SectionTitle title="История" />

        {historyGoals.length === 0 ? (
          <Text className="text-sm text-gray-500">Пока нет архивных целей</Text>
        ) : (
          historyGoals.map((g) => {
            const p = progressMap[g.id];
            const percent = p ? Math.round((p.done / Math.max(1, p.target)) * 100) : 0;
            const subtitle = `${g.start_at} — ${g.end_at}`;
            const title = g.type === "pages" ? `${p ? p.done : 0} / ${g.target} стр.` : `${p ? Math.round((p.done / 3600) * 10) / 10 : 0} / ${g.target} ч`;

            const now = new Date();
            const isCompleted = !!g.completed_at;
            const isExpired = !g.completed_at && new Date(String(g.end_at)) < now;

            const status: "normal" | "completed" | "failed" = isCompleted ? "completed" : isExpired ? "failed" : "normal";

            return <GoalCard key={g.id} percent={percent} subtitle={subtitle} title={title} status={status} />;
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
