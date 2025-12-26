import React, { useCallback, useMemo, useState } from "react";
import { Pressable, View, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

import BackIcon from "@/assets/icons/back.svg";
import CheckIcon from "@/assets/icons/check.svg";

import { useNotesRepository } from "@/src/features/notes/notes.repository";

const BG = "#F4F0FF";
const TEXT_MUTED = "#7C7790";
const PURPLE = "#7C5CFF";
const PURPLE_SOFT = "#E9D5FF";

type Params = { id_book?: string; returnTo?: string };

export default function NoteCreateScreen() {
  const notesRepo = useNotesRepository();
  const params = useLocalSearchParams<Params>();

  const bookId = useMemo(() => {
    const n = Number(params.id_book);
    return Number.isFinite(n) ? n : 0;
  }, [params.id_book]);

  const goBack = useCallback(() => {
    router.back()
  }, []);

  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = text.trim().length > 0 && bookId > 0 && !saving;

  const save = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await notesRepo.create({ id_book: bookId, text: text.trim() });
      goBack();
    } finally {
      setSaving(false);
    }
  }, [bookId, canSave, goBack, notesRepo, text]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: BG }} edges={["left", "right", "top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={goBack} className="h-10 w-10 items-center justify-center rounded-full">
          <BackIcon width={24} height={24} color="#374151" />
        </Pressable>

        <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
          Новая заметка
        </Text>

        <Pressable
          onPress={save}
          disabled={!canSave}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ opacity: canSave ? 1 : 0.4 }}
        >
          <CheckIcon width={24} height={24} />
        </Pressable>
      </View>

      <View className="px-4">
        <Card className="rounded-2xl bg-white px-4 py-4">
          <Text className="text-sm font-semibold" style={{ color: "#111827" }}>
            Текст заметки
          </Text>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Напишите заметку..."
            placeholderTextColor={TEXT_MUTED}
            multiline
            className="mt-0.5 min-h-[140px] rounded-2xl border px-3 py-3 text-base"
            style={{ borderColor: PURPLE_SOFT, color: "#111827", backgroundColor: "#FFFFFF" }}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}
