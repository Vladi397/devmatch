import React, { useState, useMemo } from "react";
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
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import type { ColorPalette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/theme";

export default function LoginScreen() {
  const { login, loading, error } = useAuth();
  const { colors: Colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate(em: string, pw: string) {
    const errors: { email?: string; password?: string } = {};
    if (!em.trim()) errors.email = t("auth.emailRequired");
    else if (!/\S+@\S+\.\S+/.test(em)) errors.email = t("auth.validEmail");
    if (!pw) errors.password = t("auth.passwordRequired");
    else if (pw.length < 6) errors.password = t("auth.minPassword");
    return errors;
  }

  function handleLogin() {
    const errs = validate(email, password);
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    login(email, password);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
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
            <Text style={styles.cardTitle}>{t("auth.welcomeBack")}</Text>
            <Text style={styles.cardSubtitle}>{t("auth.signInSubtitle")}</Text>

            <AuthInput
              icon="mail-outline"
              placeholder="your.name@example.com"
              keyboardType="email-address"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
              }}
              error={fieldErrors.email}
            />

            <AuthInput
              icon="lock-closed-outline"
              placeholder={t("auth.password")}
              isPassword
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
              }}
              error={fieldErrors.password}
            />

            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgotText}>{t("auth.forgotPassword")}</Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.apiError}>
                <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} />
                <Text style={styles.apiErrorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>{t("auth.signIn")}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>{t("auth.noAccount")} </Text>
              <Link href="/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.registerLink}>{t("auth.signUp")}</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(350).duration(400)} style={styles.hint}>
            Demo: demo@jobai.com / password123
          </Animated.Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    blob: { position: "absolute", borderRadius: 999, opacity: 0.15 },
    blobTL: { width: 300, height: 300, backgroundColor: Colors.blue, top: -100, left: -100 },
    blobBR: { width: 250, height: 250, backgroundColor: Colors.cyan + "55", bottom: 50, right: -80 },
    logoWrap: { alignItems: "center", marginTop: 80, marginBottom: 40 },
    card: {
      backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
      borderWidth: 1, borderColor: Colors.border, padding: Spacing.xxl, gap: 0,
    },
    cardTitle: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary, textAlign: "center", marginBottom: 6 },
    cardSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginBottom: Spacing.xl },
    forgotRow: { alignSelf: "flex-end", marginBottom: Spacing.lg, marginTop: -4 },
    forgotText: { fontSize: 13, color: Colors.blue, fontWeight: "500" },
    apiError: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: Colors.danger + "18", borderRadius: Radius.sm,
      borderWidth: 1, borderColor: Colors.danger + "33",
      padding: 10, marginBottom: Spacing.md,
    },
    apiErrorText: { color: Colors.danger, fontSize: 12, flex: 1 },
    btnPrimary: {
      backgroundColor: Colors.blue, borderRadius: Radius.full,
      paddingVertical: 15, alignItems: "center",
      marginBottom: Spacing.lg, marginTop: Spacing.sm,
    },
    btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
    registerRow: { flexDirection: "row", justifyContent: "center" },
    registerText: { fontSize: 13, color: Colors.textSecondary },
    registerLink: { fontSize: 13, color: Colors.cyan, fontWeight: "600" },
    hint: { marginTop: Spacing.xl, textAlign: "center", fontSize: 11, color: Colors.textMuted },
  });
}
