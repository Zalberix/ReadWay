import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

import BackIcon from "@/assets/icons/back.svg";
import PlaceholderIcon from "@/assets/icons/book-placeholder.svg";
import CameraIcon from "@/assets/icons/camera.svg";
import CheckIcon from "@/assets/icons/check.svg";

import { useBooksRepository } from "@/src/features/books/books.repository";
import { CoverStorage } from "@/src/features/books/cover.storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const BG = "#F4F0FF";
const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";
const TEXT_MUTED = "#7C7790";
const INPUT_BG = "#F4F4F7";

type Params = {
  id_book?: string;
};

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-1 text-sm font-medium" style={{ color: TEXT_MUTED }}>
      {children}
    </Text>
  );
}

function Input({
                 value,
                 onChangeText,
                 placeholder,
                 keyboardType,
               }: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
      className="rounded-xl px-4 py-3 text-base"
      style={{ backgroundColor: INPUT_BG }}
    />
  );
}

function Date3Input({
                      day,
                      month,
                      year,
                      setDay,
                      setMonth,
                      setYear,
                    }: {
  day: string;
  month: string;
  year: string;
  setDay: (v: string) => void;
  setMonth: (v: string) => void;
  setYear: (v: string) => void;
}) {
  return (
    <View className="flex-row gap-2">
      <TextInput
        value={day}
        onChangeText={(v) => setDay(v.replace(/\D/g, "").slice(0, 2))}
        placeholder="DD"
        placeholderTextColor="#9CA3AF"
        keyboardType="number-pad"
        className="flex-1 rounded-xl px-4 py-3 text-base"
        style={{ backgroundColor: INPUT_BG }}
      />
      <TextInput
        value={month}
        onChangeText={(v) => setMonth(v.replace(/\D/g, "").slice(0, 2))}
        placeholder="MM"
        placeholderTextColor="#9CA3AF"
        keyboardType="number-pad"
        className="flex-1 rounded-xl px-4 py-3 text-base"
        style={{ backgroundColor: INPUT_BG }}
      />
      <TextInput
        value={year}
        onChangeText={(v) => setYear(v.replace(/\D/g, "").slice(0, 4))}
        placeholder="YYYY"
        placeholderTextColor="#9CA3AF"
        keyboardType="number-pad"
        className="flex-[1.5] rounded-xl px-4 py-3 text-base"
        style={{ backgroundColor: INPUT_BG }}
      />
    </View>
  );
}

function BookCover({ uri, onPick }: { uri?: string | null; onPick?: () => void }) {
  const has = typeof uri === "string" && uri.trim().length > 0;

  return (
    <View className="items-center">
      <View className="relative overflow-hidden rounded-2xl" style={{ width: 160, height: 140 }}>
        {has ? (
          <Image source={{ uri: uri! }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <PlaceholderIcon width={44} height={44} color="#B8B3C8" />
          </View>
        )}

        <Pressable
          onPress={onPick}
          className="absolute bottom-2 right-2 h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <CameraIcon width={18} height={18} color="#6B677A" />
        </Pressable>
      </View>
    </View>
  );
}

export default function BookEditScreen() {
  const db = useSQLiteContext();
  const booksRepo = useBooksRepository();
  const params = useLocalSearchParams<Params>();

  const bookId = useMemo(() => Number(params.id_book ?? 0), [params.id_book]);

  const goBack = () => {
    router.back()
  };

  // Form state
  const [title, setTitle] = useState("");
  const [isbn, setIsbn] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [publisher, setPublisher] = useState("");
  const [pubDD, setPubDD] = useState("");
  const [pubMM, setPubMM] = useState("");
  const [pubYYYY, setPubYYYY] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");
  const [authors, setAuthors] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [coverPath, setCoverPath] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const canSubmit = title.trim().length > 0 && !saving;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!bookId) return;

      const book = await db.getFirstAsync<BookRow>(
        `SELECT id_book, cover_path, name, description, ISBN, page_count, publisher_name,
                year_of_publication, month_of_publication, day_of_publication
           FROM books
          WHERE id_book = ?`,
        [bookId]
      );

      const rows = await db.getAllAsync<{ full_name: string }>(
        `SELECT a.full_name
           FROM book_authors ba
           JOIN authors a ON a.id_author = ba.id_author
          WHERE ba.id_book = ?
          ORDER BY a.full_name`,
        [bookId]
      );

      if (cancelled) return;
      if (!book) return;

      setTitle(book.name ?? "");
      setIsbn(book.ISBN ?? "");
      setTotalPages(String(book.page_count ?? 0));
      setPublisher(book.publisher_name ?? "");
      setPubDD(book.day_of_publication ? String(book.day_of_publication) : "");
      setPubMM(book.month_of_publication ? String(book.month_of_publication) : "");
      setPubYYYY(book.year_of_publication ? String(book.year_of_publication) : "");
      setDescription(book.description ?? "");
      setCoverPath(book.cover_path ?? null);
      setAuthors(rows.map((x) => x.full_name));
    })();

    return () => {
      cancelled = true;
    };
  }, [bookId, db]);

  const addAuthor = () => {
    const v = authorQuery.trim();
    if (!v) return;
    setAuthors((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setAuthorQuery("");
  };

  const removeAuthor = (name: string) => {
    setAuthors((prev) => prev.filter((x) => x !== name));
  };

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (res.canceled) return;

    const uri = res.assets?.[0]?.uri;
    if (!uri) return;

    const savedPath = await CoverStorage.saveFromPickerUri(uri);
    setCoverPath(savedPath);
  };

  const onSave = async () => {
    if (!canSubmit || !bookId) return;

    const pagesNum = Number(totalPages);
    const pageCount = Number.isFinite(pagesNum) && pagesNum > 0 ? Math.floor(pagesNum) : 0;

    const y = pubYYYY ? Number(pubYYYY) : null;
    const m = pubMM ? Number(pubMM) : null;
    const d = pubDD ? Number(pubDD) : null;

    setSaving(true);
    try {
      await booksRepo.updateFull(bookId, {
        name: title.trim(),
        description: description.trim().length ? description.trim() : null,
        ISBN: isbn.trim().length ? isbn.trim() : null,
        page_count: pageCount,
        publisher_name: publisher.trim().length ? publisher.trim() : null,
        year_of_publication: Number.isFinite(y as any) ? y : null,
        month_of_publication: Number.isFinite(m as any) ? m : null,
        day_of_publication: Number.isFinite(d as any) ? d : null,
        cover_path: coverPath,
        authors,
      });

      goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: BG }} edges={["left", "right", "bottom"]}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={goBack} className="h-10 w-10 items-center justify-center rounded-full">
            <BackIcon width={24} height={24} color="#374151" />
          </Pressable>

          <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
            Редактировать книгу
          </Text>

          <Pressable
            onPress={onSave}
            disabled={!canSubmit}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ opacity: canSubmit ? 1 : 0.4 }}
          >
            <CheckIcon width={24} height={24} />
          </Pressable>
        </View>

        <KeyboardAwareScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-28"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={16}
        >
          <BookCover uri={coverPath} onPick={pickCover} />

          <View className="mt-4">
            <SectionTitle title="Основная информация" />
            <Card className="rounded-2xl bg-white px-4 py-4">
              <View className="mb-3">
                <FieldLabel>Заголовок</FieldLabel>
                <Input value={title} onChangeText={setTitle} placeholder="Название книги" />
              </View>

              <View className="mb-3">
                <FieldLabel>ISBN</FieldLabel>
                <Input value={isbn} onChangeText={setIsbn} placeholder="Номер" />
              </View>

              <View>
                <FieldLabel>Всего страниц</FieldLabel>
                <Input
                  value={totalPages}
                  onChangeText={(v) => setTotalPages(v.replace(/\D/g, ""))}
                  placeholder="Количество страниц"
                  keyboardType="number-pad"
                />
              </View>
            </Card>
          </View>

          <View className="mt-6">
            <SectionTitle title="Информация о публикации" />
            <Card className="rounded-2xl bg-white px-4 py-4">
              <View className="mb-3">
                <FieldLabel>Издатель</FieldLabel>
                <Input value={publisher} onChangeText={setPublisher} placeholder="Наименование издателя" />
              </View>

              <View>
                <FieldLabel>Дата публикации</FieldLabel>
                <Date3Input day={pubDD} month={pubMM} year={pubYYYY} setDay={setPubDD} setMonth={setPubMM} setYear={setPubYYYY} />
              </View>
            </Card>
          </View>

          <View className="mt-6">
            <SectionTitle title="Авторы" />
            <Card className="rounded-2xl bg-white px-4 py-4">
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <TextInput
                    value={authorQuery}
                    onChangeText={setAuthorQuery}
                    placeholder="ФИО"
                    placeholderTextColor="#9CA3AF"
                    className="rounded-xl px-4 py-3 text-base"
                    style={{ backgroundColor: INPUT_BG }}
                  />
                </View>
              </View>

              {authors.length > 0 && (
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {authors.map((a) => (
                    <Pressable
                      key={a}
                      onPress={() => removeAuthor(a)}
                      className="rounded-full px-3 py-2"
                      style={{ backgroundColor: PURPLE_SOFT }}
                    >
                      <Text className="text-sm font-medium" style={{ color: "#111827" }}>
                        {a} ✕
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Pressable onPress={addAuthor} className="mt-4 items-center justify-center">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl font-semibold" style={{ color: PURPLE }}>
                    Добавить
                  </Text>
                  <Text className="text-2xl font-semibold" style={{ color: PURPLE }}>
                    +
                  </Text>
                </View>
              </Pressable>
            </Card>
          </View>

          <View className="mt-6">
            <SectionTitle title="Описание" />
            <Card className="rounded-2xl bg-white px-4 py-4">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Описание книги"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                className="rounded-xl px-4 py-3 text-base"
                style={{ backgroundColor: INPUT_BG, minHeight: 110 }}
              />
            </Card>
          </View>

          <View className="h-6" />
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
