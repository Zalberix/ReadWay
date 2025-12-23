import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import {PortalHost} from "@rn-primitives/portal";
import {useEffect, useState} from "react";
import {db} from "@/src/db/sqlite.service";

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await db.init();
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(modals)/book-create"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
      <PortalHost />
    </ThemeProvider>
  );
}
