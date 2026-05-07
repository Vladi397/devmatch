import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Platform } from "react-native";
import { useTheme } from "@/hooks/useTheme";

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

export default function Index() {
  const { colors: Colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const token = await getItem("auth_token");
        if (!token) { router.replace("/welcome" as any); return; }
        const lang = await getItem("app_language");
        router.replace(lang ? "/(tabs)/dashboard" : ("/language" as any));
      } catch {
        router.replace("/welcome" as any);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.bg }}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );
}
