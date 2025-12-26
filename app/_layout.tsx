import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider } from "@/src/contexts/session";
import { runMigrationsIfNeed } from "@/src/db/migrations";
import { PortalHost } from "@rn-primitives/portal";
import { SQLiteProvider } from "expo-sqlite";
import { View } from 'react-native';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const showTopSpacer = pathname !== "/"; // don't duplicate on index

  const BG = '#F4F0FF';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName="app.db" onInit={runMigrationsIfNeed}>
        <SafeAreaProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SessionProvider>
              {showTopSpacer ? (
                <SafeAreaView edges={["top"]} style={{ backgroundColor: BG }}>
                  <View style={{ backgroundColor: BG }} className="px-4 py-4" />
                </SafeAreaView>
              ) : null}
              <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="(modal)/book-create"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen
                name="(modal)/book-edit"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen
                name="(modal)/session-create"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="(modal)/session-edit"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="(modal)/note-create"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen
                name="(modal)/note-edit"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen
                name="(modal)/book-sessions"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="(modal)/goal-create"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen
                name="(modal)/goal-edit"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen
                name="(modal)/questions"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen
                name="(page)/book"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="session"
                options={{ headerShown: false }}
              />
            </Stack>
            </SessionProvider>
            <StatusBar style="auto" />
            <PortalHost />
          </ThemeProvider>
        </SafeAreaProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
