// src/features/books/cover.storage.ts
import * as FileSystem from "expo-file-system/legacy";

function extFromUri(uri: string) {
  const m = uri.toLowerCase().match(/\.(jpg|jpeg|png|webp|heic|heif)(\?.*)?$/);
  return m?.[1] ?? "jpg";
}

export const CoverStorage = {
  async saveFromPickerUri(pickerUri: string): Promise<string> {
    const baseDir = FileSystem.documentDirectory;
    if (!baseDir) throw new Error("documentDirectory is not available");

    const dir = `${baseDir}covers/`;

    // Создаём папку (если уже есть — не упадёт)
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    const ext = extFromUri(pickerUri);
    const filename = `cover_${Date.now()}.${ext}`;
    const dest = `${dir}${filename}`;

    // На всякий случай: если файл с таким именем вдруг существует
    await FileSystem.deleteAsync(dest, { idempotent: true });

    await FileSystem.copyAsync({ from: pickerUri, to: dest });

    return dest; // file://... путь для хранения в БД
  },

  async removeIfExists(path: string | null) {
    if (!path) return;
    await FileSystem.deleteAsync(path, { idempotent: true });
  },
};
