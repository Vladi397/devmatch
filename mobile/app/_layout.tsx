import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Platform } from "react-native";

export default function RootLayout() {
  useEffect(() => {
    // Delay gives the navigator time to fully mount before redirecting
    const timer = setTimeout(async () => {
      try {
        let token: string | null = null;

        if (Platform.OS !== "web") {
          token = await SecureStore.getItemAsync("auth_token");
        } else {
          token = localStorage.getItem("auth_token");
        }

        router.replace(token ? "/(tabs)/dashboard" : "/login");
      } catch {
        router.replace("/login");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}