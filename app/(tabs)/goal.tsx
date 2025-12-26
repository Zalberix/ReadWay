// app/(tabs)/goal.tsx
import React, {useMemo} from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

// Reusables (пути поправь под свой шаблон, если отличаются)
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

// Иконки из assets/icons (названия любые — потом заменишь)
import BackIcon from "@/assets/icons/back.svg";
import PlusIcon from "@/assets/icons/plus.svg";
import {router, useLocalSearchParams} from "expo-router";

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
                        }: {
  percent: number; // 0..100
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, percent)) / 100;
  const dash = c * (1 - v);

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
};

function GoalCard({ percent, subtitle, title }: GoalCardProps) {
  return (
    <Card className="mb-4 rounded-2xl bg-white px-4 py-4">
      <View className="flex-row items-center gap-4">
        <CircleProgress percent={percent} />

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

        <Pressable className="h-10 w-10 items-center justify-center rounded-full">
          <PlusIcon width={24} height={24} color="#374151" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28"
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle title="Текущая цель" />

        <GoalCard
          percent={30}
          subtitle="Цель 10.02.25-10.04.25 - 90 стр."
          title="30 страниц прочитано"
        />

        <SectionTitle title="История" />

        <GoalCard
          percent={50}
          subtitle="Цель 10.02.25-10.04.25 - 90 стр."
          title="45 страниц прочитано"
        />

        <GoalCard
          percent={30}
          subtitle="Цель 10.02.25-10.04.25 - 90 стр."
          title="30 страниц прочитано"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
