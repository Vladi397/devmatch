import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Platform } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export default function Index() {
  const { colors: Colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        let token: string | null = null;
        if (Platform.OS !== "web") {
          token = await SecureStore.getItemAsync("auth_token");
        } else {
          token = localStorage.getItem("auth_token");
        }
        router.replace(token ? "/(tabs)/dashboard" : ("/welcome" as any));
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
