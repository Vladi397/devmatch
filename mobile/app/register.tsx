import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, StatusBar,
} from "react-native";
import Animated, {
  ZoomIn, FadeInDown,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay, withSpring, Easing,
} from "react-native-reanimated";
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

// ─── Animated background blob ────────────────────────────────────────────────
function AnimBlob({ style, delay = 0 }: { style: any; delay?: number }) {
  const sc = useSharedValue(1);
  useEffect(() => {
    sc.value = withDelay(delay, withRepeat(withSequence(
      withTiming(1.14, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.0,  { duration: 5000, easing: Easing.inOut(Easing.sin) }),
    ), -1, false));
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return <Animated.View style={[style, animStyle]} />;
}

// ─── Primary button with 3D press ────────────────────────────────────────────
function PrimaryBtn({ label, onPress, loading, Colors, styles }: {
  label: string; onPress: () => void; loading: boolean;
  Colors: ColorPalette; styles: any;
}) {
  const scale = useSharedValue(1);
  const rotX  = useSharedValue(0);
  const anim  = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { scale: scale.value }, { rotateX: `${rotX.value}deg` }],
  }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 14 }); rotX.value = withSpring(5, { damping: 12 }); }}
      onPressOut={() => { scale.value = withSpring(1,   { damping: 14 }); rotX.value = withSpring(0, { damping: 12 }); }}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      disabled={loading}
    >
      <Animated.View style={[styles.btnPrimary, { backgroundColor: Colors.blue, opacity: loading ? 0.75 : 1 }, anim]}>
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.btnPrimaryText}>{label}</Text>
        }
      </Animated.View>
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const { register, loading, error } = useAuth();
  const { colors: Colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat]     = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; repeat?: string }>({});

  function validate() {
    const errs: { email?: string; password?: string; repeat?: string } = {};
    if (!email.trim()) errs.email = t("auth.emailRequired");
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = t("auth.validEmail");
    if (!password) errs.password = t("auth.passwordRequired");
    else if (password.length < 6) errs.password = t("auth.minPassword");
    if (!repeat) errs.repeat = t("auth.confirmPassword");
    else if (repeat !== password) errs.repeat = t("auth.passwordsNoMatch");
    return errs;
  }

  function handleRegister() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    register(email, password);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <AnimBlob style={[styles.blob, styles.blobTL]}  delay={0} />
      <AnimBlob style={[styles.blob, styles.blobBR]}  delay={800} />
      <AnimBlob style={[styles.blob, styles.blobMid]} delay={1400} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={ZoomIn.duration(550).springify()} style={styles.logoWrap}>
            <DevMatchLogo size="md" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.card}>
            <Text style={styles.cardTitle}>{t("auth.createAccount")}</Text>
            <Text style={styles.cardSubtitle}>{t("auth.registerSubtitle")}</Text>

            <View style={styles.fields}>
              <AuthInput
                icon="mail-outline"
                placeholder="your.name@example.com"
                keyboardType="email-address"
                value={email}
                onChangeText={(v) => { setEmail(v); if (fieldErrors.email) setFieldErrors(e => ({ ...e, email: undefined })); }}
                error={fieldErrors.email}
              />
              <AuthInput
                icon="lock-closed-outline"
                placeholder={t("auth.password")}
                isPassword
                value={password}
                onChangeText={(v) => { setPassword(v); if (fieldErrors.password) setFieldErrors(e => ({ ...e, password: undefined })); }}
                error={fieldErrors.password}
              />
              <AuthInput
                icon="lock-closed-outline"
                placeholder={t("auth.repeatPassword")}
                isPassword
                value={repeat}
                onChangeText={(v) => { setRepeat(v); if (fieldErrors.repeat) setFieldErrors(e => ({ ...e, repeat: undefined })); }}
                error={fieldErrors.repeat}
              />
            </View>

            {error ? (
              <Animated.View entering={FadeInDown.duration(250)} style={styles.apiError}>
                <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} />
                <Text style={[styles.apiErrorText, { color: Colors.danger }]}>{error}</Text>
              </Animated.View>
            ) : null}

            <PrimaryBtn
              label={t("auth.createAccount")}
              onPress={handleRegister}
              loading={loading}
              Colors={Colors}
              styles={styles}
            />

            <View style={styles.switchRow}>
              <Text style={[styles.switchText, { color: Colors.textSecondary }]}>{t("auth.haveAccount")} </Text>
              <Link href="/login" asChild>
                <Pressable>
                  <Text style={[styles.switchLink, { color: Colors.cyan }]}>{t("auth.signIn")}</Text>
                </Pressable>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: 40 },

    blob: { position: "absolute", borderRadius: 999 },
    blobTL:  { width: 320, height: 320, backgroundColor: Colors.cyan,  opacity: 0.10, top: -130, left: -110 },
    blobBR:  { width: 260, height: 260, backgroundColor: Colors.blue,  opacity: 0.09, bottom: 40, right: -100 },
    blobMid: { width: 180, height: 180, backgroundColor: Colors.pink,  opacity: 0.07, top: "40%", left: -60 },

    logoWrap: { alignItems: "center", marginTop: 60, marginBottom: 24 },

    card: {
      backgroundColor: Colors.bgCard,
      borderRadius: Radius.xl,
      borderWidth: 1.5,
      borderColor: Colors.blue + "70",
      paddingHorizontal: Spacing.xxl,
      paddingTop: Spacing.xxl,
      paddingBottom: Spacing.xl,
      shadowColor: Colors.blue,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 24,
      elevation: 8,
    },

    cardTitle:    { fontSize: 20, fontWeight: "800", color: Colors.textPrimary, textAlign: "center", marginBottom: 6 },
    cardSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginBottom: Spacing.xl },

    fields: { gap: 0, marginBottom: Spacing.sm },

    apiError: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: Colors.danger + "18", borderRadius: Radius.sm,
      borderWidth: 1, borderColor: Colors.danger + "33",
      padding: 10, marginBottom: Spacing.md,
    },
    apiErrorText: { fontSize: 12, flex: 1 },

    btnPrimary: {
      borderRadius: Radius.full, paddingVertical: 16,
      alignItems: "center", marginBottom: Spacing.lg,
      shadowColor: Colors.blue, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45, shadowRadius: 16, elevation: 6,
    },
    btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },

    switchRow: { flexDirection: "row", justifyContent: "center" },
    switchText: { fontSize: 13 },
    switchLink: { fontSize: 13, fontWeight: "700" },
  });
}
