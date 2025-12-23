// app/(tabs)/books.tsx
import React from "react";
import {Image, Pressable, ScrollView, View} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";


// Reusables (пути поправь под свой шаблон, если отличаются)
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

// Иконки из assets/icons (названия любые — потом заменишь)
import BackIcon from "@/assets/icons/back.svg";
import PlusIcon from "@/assets/icons/plus.svg";

const BG = "#F4F0FF";
const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const TEXT_MUTED = "#7C7790";


const THUMB_BG = "#E9E4F4";
const THUMB_ICON = "#B8B3C8";

function BookThumb({
                     uri,
                     title,
                     size = 56,
                   }: {
  uri?: string | null;
  title: string;
  size?: number;
}) {
  const s = size;
  const hasImage = typeof uri === "string" && uri.trim().length > 0;

  if (hasImage) {
    return (
      <View
        className="overflow-hidden rounded-xl"
        style={{ width: s, height: s, backgroundColor: THUMB_BG }}
      >
        <Image
          source={{ uri: uri! }}
          style={{ width: s, height: s }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Заглушка: иконка + первая буква названия
  const letter = (title?.trim()?.[0] ?? "К").toUpperCase();

  return (
    <View
      className="items-center justify-center rounded-xl"
      style={{ width: s, height: s, backgroundColor: THUMB_BG }}
    >
      <Text className="mt-1 text-xs font-semibold" style={{ color: THUMB_ICON }}>
        {letter}
      </Text>
    </View>
  );
}

function ProgressLine({
                        value,
                        max,
                      }: {
  value: number;
  max: number;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));

  return (
    <View className="mt-2">
      <View className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: PURPLE_SOFT }}>
        <View className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: PURPLE }} />
      </View>

      <View className="mt-2 flex-row items-center justify-end">
        <Text className="text-sm font-medium" style={{ color: "#4B5563" }}>
          с. {value}
          <Text className="text-sm font-medium" style={{ color: TEXT_MUTED }}>
            {" "}
            / {max}
          </Text>
        </Text>
      </View>
    </View>
  );
}

type BookCardProps = {
  title: string;
  currentPage: number;
  totalPages: number;
  coverUrl?: string | null;
};

function BookCard({ title, currentPage, totalPages, coverUrl}: BookCardProps) {
  return (
    <Card className="mb-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
      <View className="flex-row items-center gap-4">
        <BookThumb uri={coverUrl} title={title} size={64} />
        <View className="flex-1">
          <Text className="text-lg font-semibold" style={{ color: "#111827" }}>
            {title}
          </Text>
          <ProgressLine value={currentPage} max={totalPages} />
        </View>
      </View>
    </Card>
  );
}

export default function BooksScreen() {
  const books: BookCardProps[] = [
    { title: "Название книги", currentPage: 70, totalPages: 350, coverUrl:null },
    { title: "Название книги", currentPage: 70, totalPages: 350, coverUrl:null },
    { title: "Название книги", currentPage: 70, totalPages: 350, coverUrl:null },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: BG }} edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full"
          onPress={() => router.back()}
        >
          <BackIcon width={24} height={24} color="#374151" />
        </Pressable>

        <Text className="text-4xl font-semibold" style={{ color: "#111827" }}>
          Книги
        </Text>

        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full"
          onPress={() => router.push({ pathname: "/book-create", params: { returnTo: "/books" } })}
        >
          <PlusIcon width={24} height={24} color="#374151" />
        </Pressable>
      </View>

      {books.length === 0 ? (
        <View className="w-full h-full flex items-center justify-center px-4 pb-28">
          <Text className="text-xl" style={{ color: TEXT_MUTED }}>
            Ваш список книг пуст
          </Text>
        </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pb-28"
            showsVerticalScrollIndicator={false}
          >
            {books.map((b, idx) => (
              <BookCard
                key={`${b.title}-${idx}`}
                title={b.title}
                currentPage={b.currentPage}
                totalPages={b.totalPages}
                coverUrl={b.coverUrl ?? null}
              />
            ))}

          </ScrollView>
        )}
    </SafeAreaView>
  );
}
