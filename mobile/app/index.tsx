import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Platform } from "react-native";
import { Colors } from "@/constants/theme";

export default function Index() {
  useEffect(() => {
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
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.bg }}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );
}
