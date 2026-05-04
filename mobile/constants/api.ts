import { Platform } from "react-native";

export const API_URL = Platform.OS === "web"
  ? "http://localhost:3000"
  : "http://192.168.0.2:3000";
