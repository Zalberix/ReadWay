// app/(tabs)/index.tsx
import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { router } from "expo-router";

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import '../../global.css';

import PlusIcon from "@/assets/icons/plus.svg";
import FireIcon from "@/assets/icons/fire.svg";
import ChevronRightIcon from "@/assets/icons/chevron-right.svg";

const PURPLE = "#8B5CF6"; // можно заменить на токены темы
const PURPLE_SOFT = "#E9D5FF";
const TEXT_MUTED = "#7C7790";

function CircleProgress({
                          value,
                          size = 56,
                          strokeWidth = 6,
                        }: {
  value: number; // 0..1
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
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
        <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
          {Math.round(v * 100)}%
        </Text>
      </View>
    </View>
  );
}

function DayDot({ label }: { label: string }) {
  return (
    <View className="items-center gap-1">
      <View className="h-6 w-6 rounded-full border-2 border-[#6B677A] bg-transparent" />
      <Text className="text-xs" style={{ color: "#6B677A" }}>
        {label}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right", "bottom"]} className="flex-1 bg-[#F4F0FF]">
      <View className="items-center justify-center px-4 py-4">
        <Text className="text-4xl font-semibold" style={{ color: "#111827" }}>
          ReadWay
        </Text>
      </View>

      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-28"
          showsVerticalScrollIndicator={false}
        >
          <Card className="mb-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
            <View className="items-center justify-center">
              <Text className="text-2xl flex justify-center font-semibold" style={{ color: "#111827" }}>
                Добавьте свою первую книгу!
              </Text>
            </View>

            <Pressable
              className="mt-2 items-center justify-center"
              onPress={() => router.push({ pathname: "/books", params: { openCreate: "1" } })}
            >
              <View className="flex-row items-center gap-2" >
                <Text className="text-2xl font-semibold" style={{ color: PURPLE }}>
                  Добавить
                </Text>
                <Text className="text-3xl font-semibold" style={{ color: PURPLE }}>
                  +
                </Text>
              </View>
            </Pressable>
          </Card>

          <Card className="mb-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
            <Pressable className="flex-row items-center gap-4">
              <CircleProgress value={0} />

              <View className="flex-1">
                <Text className="text-xl" style={{ color: TEXT_MUTED }}>
                  Цель не выбрана
                </Text>
                <Text className="mt-1 text-2xl font-semibold" style={{ color: "#111827" }}>
                  Нажмите для выбора
                </Text>
              </View>
            </Pressable>
          </Card>

          <Card className="mb-6 rounded-2xl bg-white px-4 py-4 shadow-sm">
            <View className="flex-row items-center gap-3">
              <FireIcon width={24} height={24} color="#6B677A" />
              <View>
                <Text className="text-base font-semibold" style={{ color: "#111827" }}>
                  Серия
                </Text>
                <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                  0 дней
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between px-1">
              <DayDot label="Пн" />
              <DayDot label="Вт" />
              <DayDot label="Ср" />
              <DayDot label="Чт" />
              <DayDot label="Пт" />
              <DayDot label="Сб" />
              <DayDot label="Вс" />
            </View>
          </Card>

          {/* Section: Books */}
          <Pressable className="mb-3 flex-row items-center gap-2">
            <View className="h-4 w-1 rounded-full" style={{ backgroundColor: PURPLE_SOFT }} />
            <Text className="text-lg font-semibold" style={{ color: "#6B677A" }}>
              Книги
            </Text>
            <ChevronRightIcon width={18} height={18} color="#6B677A" />
          </Pressable>

          <View className="items-center justify-center py-10">
            <Text className="text-base" style={{ color: "#6B677A" }}>
              Ваш список книг пуст
            </Text>
          </View>
        </ScrollView>

        {/* Floating Action Button */}
        <View className="absolute bottom-6 right-6">
          <Pressable
            className="h-14 w-14 items-center justify-center rounded-full"
            onPress={() => router.push({ pathname: "/books", params: { openCreate: "1" } })}
            style={{ backgroundColor: "#E9D5FF" }}
          >
            <PlusIcon width={24} height={24} color={PURPLE} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
