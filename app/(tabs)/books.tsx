// app/(tabs)/books.tsx
import React, {useState} from "react";
import {Image, Pressable, ScrollView, View} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useEffect } from "react";

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

import BackIcon from "@/assets/icons/back.svg";
import PlusIcon from "@/assets/icons/plus.svg";
import PlaceholderIcon from "@/assets/icons/book-placeholder.svg";

import {BooksWithCurrentPage, useBooksRepository} from "@/src/features/books/books.repository";

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
  const s = size ?? 64;
  const hasImage = typeof uri === "string" && uri.trim().length > 0;

  if (!hasImage) {
    return (
      <View
        className="overflow-hidden rounded-xl"
        style={{backgroundColor: THUMB_BG }}
      >
        <PlaceholderIcon width={size} height={size} style={{ backgroundColor: THUMB_BG}} />
      </View>
    );
  } else {
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

      <View className="mt-2 flex-row items-center justify-center">
        <Text className="text-sm font-medium" style={{ color: "#4B5563" }}>
          <Text className="text-base font-bold" style={{ color: TEXT_MUTED }}>
            с. {value}
          </Text>
          {" "} / {max}
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

function BookCard({ title, currentPage, totalPages, coverUrl, onPress }: BookCardProps & { onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
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
    </Pressable>
  );
}

let numRend = 1;

export default function BooksScreen() {
  numRend += 1;
  const booksRepo = useBooksRepository();
  // const books: BookCardProps[] = [
  //   { title: "Название книги", currentPage: 70, totalPages: 350, coverUrl:null },
  //   { title: "Название книги", currentPage: 70, totalPages: 350, coverUrl:null },
  //   { title: "Название книги", currentPage: 70, totalPages: 350, coverUrl:null },
  // ];

  const [books, setBooks] = useState<BooksWithCurrentPage[]>([] as BooksWithCurrentPage[]);
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const list = await booksRepo.list();
      if (cancelled) return;

      setBooks(list);
      console.log(numRend);
    })();

    return () => {
      cancelled = true;
    };
  }, [booksRepo]);


  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: BG }} edges={["left", "right", "top", "bottom"]}>
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
                key={`${b.id_book}-${idx}`}
                title={b.name}
                currentPage={b.currentPage}
                totalPages={b.page_count}
                coverUrl={b.cover_path ?? null}
                onPress={() =>
                  router.push({
                    pathname: "/book",
                    params: { id_book: String(b.id_book) },
                  })
                }
              />
            ))}

          </ScrollView>
        )}
    </SafeAreaView>
  );
}
