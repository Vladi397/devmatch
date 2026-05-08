import { useState } from "react";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Platform } from "react-native";
import { API_URL } from "@/constants/api";

const LANG_KEY = "app_language";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

async function saveItem(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(email: string, password: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Login failed");
      await saveItem(TOKEN_KEY, data.token);
      await saveItem(USER_KEY, JSON.stringify(data.user));
      const lang = await getItem(LANG_KEY);
      router.replace(lang ? "/(tabs)/dashboard" : ("/language" as any));
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function register(email: string, password: string, name?: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Registration failed");
      await saveItem(TOKEN_KEY, data.token);
      await saveItem(USER_KEY, JSON.stringify(data.user));
      router.replace("/language" as any);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function socialLogin(token: string, user: { id: string; email: string; name: string }) {
    await saveItem(TOKEN_KEY, token);
    await saveItem(USER_KEY, JSON.stringify(user));
    const lang = await getItem(LANG_KEY);
    router.replace(lang ? "/(tabs)/dashboard" : ("/language" as any));
  }

  async function logout() {
    await removeItem(TOKEN_KEY);
    await removeItem(USER_KEY);
    router.replace("/login");
  }

  async function getToken() {
    return await getItem(TOKEN_KEY);
  }

  return { login, register, socialLogin, logout, getToken, loading, error };
}