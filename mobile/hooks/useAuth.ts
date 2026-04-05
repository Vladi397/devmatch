import { useState } from "react";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Platform } from "react-native";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

// Cross-platform storage helpers
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

// Mock API — replace with real fetch() later
async function mockLoginAPI(email: string, password: string) {
  await new Promise((res) => setTimeout(res, 1200));
  if (email === "demo@jobai.com" && password === "password123") {
    return { token: "mock_jwt_token_abc123", user: { id: "1", name: "Vladi", email } };
  }
  throw new Error("Invalid email or password.");
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(email: string, password: string) {
    try {
      setLoading(true);
      setError(null);
      const { token, user } = await mockLoginAPI(email, password);
      await saveItem(TOKEN_KEY, token);
      await saveItem(USER_KEY, JSON.stringify(user));
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await removeItem(TOKEN_KEY);
    await removeItem(USER_KEY);
    router.replace("/login");
  }

  async function getToken() {
    return await getItem(TOKEN_KEY);
  }

  return { login, logout, getToken, loading, error };
}