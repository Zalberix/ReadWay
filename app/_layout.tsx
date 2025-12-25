import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import {PortalHost} from "@rn-primitives/portal";
import {SafeAreaProvider} from "react-native-safe-area-context";
import {SQLiteProvider} from "expo-sqlite";
import {runMigrationsIfNeed} from "@/src/db/migrations";

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SQLiteProvider databaseName="app.db" onInit={runMigrationsIfNeed}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="(modal)/book-create"
              options={{ presentation: "modal", headerShown: false }}
            />
          </Stack>
          <StatusBar style="auto" />
          <PortalHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </SQLiteProvider>
  );
}
