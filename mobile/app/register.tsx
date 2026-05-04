import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StatusBar,
} from "react-native";
import Animated, { ZoomIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { AuthInput } from "@/components/AuthInput";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Radius, Spacing } from "@/constants/theme";

function validate(email: string, password: string, repeat: string) {
  const errors: { email?: string; password?: string; repeat?: string } = {};
  if (!email.trim()) errors.email = "Email is required.";
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Enter a valid email.";
  if (!password) errors.password = "Password is required.";
  else if (password.length < 6) errors.password = "Minimum 6 characters.";
  if (!repeat) errors.repeat = "Please confirm your password.";
  else if (repeat !== password) errors.repeat = "Passwords do not match.";
  return errors;
}

export default function RegisterScreen() {
  const { register, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; repeat?: string }>({});

  function handleRegister() {
    const errs = validate(email, password, repeat);
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    register(email, password);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.blob, styles.blobTL]} />
      <View style={[styles.blob, styles.blobBR]} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={ZoomIn.duration(500).springify()} style={styles.logoWrap}>
            <DevMatchLogo size="md" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.card}>
            <Text style={styles.cardTitle}>Create account</Text>
            <Text style={styles.cardSubtitle}>Start optimizing your job hunt with AI</Text>

            <AuthInput
              icon="mail-outline"
              placeholder="your.name@example.com"
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
              }}
              error={fieldErrors.email}
            />

            <AuthInput
              icon="lock-closed-outline"
              placeholder="Password"
              isPassword
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
              }}
              error={fieldErrors.password}
            />

            <AuthInput
              icon="lock-closed-outline"
              placeholder="Repeat Password"
              isPassword
              value={repeat}
              onChangeText={(t) => {
                setRepeat(t);
                if (fieldErrors.repeat) setFieldErrors((e) => ({ ...e, repeat: undefined }));
              }}
              error={fieldErrors.repeat}
            />

            {error ? (
              <View style={styles.apiError}>
                <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} />
                <Text style={styles.apiErrorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginLink}>Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  blob: { position: "absolute", borderRadius: 999, opacity: 0.15 },
  blobTL: { width: 300, height: 300, backgroundColor: Colors.blue, top: -100, left: -100 },
  blobBR: { width: 250, height: 250, backgroundColor: Colors.cyan + "55", bottom: 50, right: -80 },
  logoWrap: { alignItems: "center", marginTop: 70, marginBottom: 36 },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xxl,
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary, textAlign: "center", marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginBottom: Spacing.xl },
  apiError: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.danger + "18", borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.danger + "33",
    padding: 10, marginBottom: Spacing.md,
  },
  apiErrorText: { color: Colors.danger, fontSize: 12, flex: 1 },
  btnPrimary: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.full,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  loginRow: { flexDirection: "row", justifyContent: "center" },
  loginText: { fontSize: 13, color: Colors.textSecondary },
  loginLink: { fontSize: 13, color: Colors.cyan, fontWeight: "600" },
});
