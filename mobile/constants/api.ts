import { Platform } from "react-native";
import Constants from "expo-constants";

function getApiUrl(): string {
  if (Platform.OS === "web") return "http://localhost:3000";

  // Expo Go embeds the dev server host in its manifest.
  const host =
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost?.split(":")[0] ||
    (Constants as any).manifest?.debuggerHost?.split(":")[0] ||
    (Constants as any).manifest?.hostUri?.split(":")[0];

  if (host) return `http://${host}:3000`;

  // Hard fallback — only reached in a standalone/production build
  return "http://192.168.0.4:3000";
}

export const API_URL = getApiUrl();
