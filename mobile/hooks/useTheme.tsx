import React, { createContext, useContext, useState, useEffect } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { darkColors, lightColors, ColorPalette } from "@/constants/theme";

const THEME_KEY = "app_theme";

async function loadTheme(): Promise<"dark" | "light"> {
  try {
    const val = Platform.OS === "web"
      ? localStorage.getItem(THEME_KEY)
      : await SecureStore.getItemAsync(THEME_KEY);
    return val === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

async function saveTheme(mode: "dark" | "light") {
  try {
    if (Platform.OS === "web") localStorage.setItem(THEME_KEY, mode);
    else await SecureStore.setItemAsync(THEME_KEY, mode);
  } catch {}
}

type ThemeCtx = {
  mode: "dark" | "light";
  colors: ColorPalette;
  isDark: boolean;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeCtx>({
  mode: "dark",
  colors: darkColors,
  isDark: true,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"dark" | "light">("dark");

  useEffect(() => {
    loadTheme().then(setMode);
  }, []);

  function toggle() {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    saveTheme(next);
  }

  const colors = mode === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark: mode === "dark", toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
