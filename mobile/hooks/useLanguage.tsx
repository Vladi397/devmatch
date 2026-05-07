import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { translations, type LanguageCode, type Translations } from "@/constants/i18n";

const LANG_KEY = "app_language";

async function loadLang(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(LANG_KEY);
  return SecureStore.getItemAsync(LANG_KEY);
}

async function saveLang(code: string) {
  if (Platform.OS === "web") localStorage.setItem(LANG_KEY, code);
  else await SecureStore.setItemAsync(LANG_KEY, code);
}

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoaded: boolean;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: async () => {},
  t: (key) => key,
  isLoaded: false,
});

function resolve(obj: any, path: string): string | undefined {
  return path.split(".").reduce((acc, k) => (acc && typeof acc === "object" ? acc[k] : undefined), obj);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<LanguageCode>("en");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadLang().then((saved) => {
      if (saved && saved in translations) setLangState(saved as LanguageCode);
      setIsLoaded(true);
    });
  }, []);

  const setLanguage = useCallback(async (code: LanguageCode) => {
    await saveLang(code);
    setLangState(code);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const tr: Translations = translations[language];
    const raw = resolve(tr, key);
    if (typeof raw !== "string") return key;
    if (!params) return raw;
    return raw.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ""));
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export { loadLang };
