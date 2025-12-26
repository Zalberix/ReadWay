import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

import BackIcon from "@/assets/icons/back.svg";
import CheckIcon from "@/assets/icons/check.svg";
import TrashIcon from "@/assets/icons/trash.svg";

import { useNotesRepository } from "@/src/features/notes/notes.repository";

const BG = "#F4F0FF";
const TEXT_MUTED = "#7C7790";
const PURPLE_SOFT = "#E9D5FF";
const PURPLE = "#7C5CFF";

type Params = { id_note?: string; id_book?: string; returnTo?: string };

export default function NoteEditScreen() {
  const notesRepo = useNotesRepository();
  const params = useLocalSearchParams<Params>();

  const noteId = useMemo(() => {
    const n = Number(params.id_note);
    return Number.isFinite(n) ? n : 0;
  }, [params.id_note]);

  const goBack = useCallback(() => {
    router.back()
  }, []);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        if (!noteId) return;
        setLoading(true);
        const n = await notesRepo.getById(noteId);
        if (cancelled) return;

        setText(n?.text ?? "");
        setLoading(false);
      })();

      return () => {
        cancelled = true;
      };
    }, [noteId, notesRepo]),
  );

  const canSave = !loading && !saving && noteId > 0 && text.trim().length > 0;

  const save = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await notesRepo.update(noteId, { text: text.trim() });
      goBack();
    } finally {
      setSaving(false);
    }
  }, [canSave, goBack, noteId, notesRepo, text]);

  const remove = useCallback(async () => {
    if (!noteId) return;
    // если хочешь confirm — можно потом вынести в Sheet как с удалением книги
    await notesRepo.remove(noteId);
    goBack();
  }, [goBack, noteId, notesRepo]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: BG }} edges={["left", "right", "top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={goBack} className="h-10 w-10 items-center justify-center rounded-full">
          <BackIcon width={24} height={24} color="#374151" />
        </Pressable>

        <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
          Редактировать
        </Text>

        <View className="flex-row items-center gap-2">
          <Pressable onPress={remove} className="h-10 w-10 items-center justify-center rounded-full">
            <TrashIcon width={22} height={22} color={PURPLE} />
          </Pressable>

          <Pressable
            onPress={save}
            disabled={!canSave}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ opacity: canSave ? 1 : 0.4 }}
          >
            <CheckIcon width={24} height={24} />
          </Pressable>
        </View>
      </View>

      <View className="px-4">
        <Card className="rounded-2xl bg-white px-4 py-4">
          <Text className="text-sm font-semibold" style={{ color: "#111827" }}>
            Текст заметки
          </Text>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Текст..."
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
