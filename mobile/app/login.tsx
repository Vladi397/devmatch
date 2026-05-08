import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, Pressable, StyleSheet, Modal,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, StatusBar, Alert,
} from "react-native";
import Animated, {
  ZoomIn, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay, withSpring, Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { AuthInput } from "@/components/AuthInput";
import { useAuth } from "@/hooks/useAuth";
import { useSocialAuth } from "@/hooks/useSocialAuth";
import { API_URL } from "@/constants/api";
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

// ─── 3D social button ────────────────────────────────────────────────────────
function SocialBtn({ icon, label, onPress, disabled }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors: Colors } = useTheme();
  const scale = useSharedValue(1);
  const rotX  = useSharedValue(0);
  const anim  = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { scale: scale.value }, { rotateX: `${rotX.value}deg` }],
  }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.88, { damping: 14 }); rotX.value = withSpring(10, { damping: 12 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 14 }); rotX.value = withSpring(0,  { damping: 12 }); }}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      disabled={disabled}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <Animated.View style={[{
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: Colors.bgInput,
        borderWidth: 1.5, borderColor: Colors.border,
        alignItems: "center", justifyContent: "center",
        shadowColor: Colors.blue, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18, shadowRadius: 8, elevation: 3,
      }, anim]}>
        <Ionicons name={icon} size={22} color={Colors.textPrimary} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function OrDivider({ label, Colors, styles }: { label: string; Colors: ColorPalette; styles: any }) {
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: Colors.border }]} />
      <Text style={[styles.dividerText, { color: Colors.textMuted }]}>{label}</Text>
      <View style={[styles.dividerLine, { backgroundColor: Colors.border }]} />
    </View>
  );
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

// ─── Forgot-password modal ────────────────────────────────────────────────────
function ForgotModal({ visible, onClose, Colors, styles }: {
  visible: boolean; onClose: () => void;
  Colors: ColorPalette; styles: any;
}) {
  const [step, setStep]       = useState<"email" | "reset">("email");
  const [email, setEmail]     = useState("");
  const [code, setCode]       = useState("");
  const [newPass, setNewPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function resetState() {
    setStep("email"); setEmail(""); setCode(""); setNewPass(""); setError("");
  }

  async function sendCode() {
    if (!email.trim()) { setError("Enter your email address."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { message: string };
      if (res.ok) setStep("reset");
      else setError(data.message ?? "Something went wrong.");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  async function submitReset() {
    if (!code.trim() || !newPass) { setError("Fill in all fields."); return; }
    if (newPass.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code, newPassword: newPass }),
      });
      const data = await res.json() as { message: string };
      if (res.ok) {
        Alert.alert("Password Reset", "Your password has been updated. You can now sign in.");
        resetState(); onClose();
      } else setError(data.message ?? "Something went wrong.");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { resetState(); onClose(); }}>
      <Pressable style={styles.modalOverlay} onPress={() => { resetState(); onClose(); }}>
        <Animated.View
          entering={FadeInDown.duration(300).springify()}
          style={[styles.modalCard, { backgroundColor: Colors.bgCard, borderColor: Colors.blue + "70" }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>
              {step === "email" ? "Forgot Password" : "Enter Reset Code"}
            </Text>
            <Pressable onPress={() => { resetState(); onClose(); }} style={styles.modalClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
            {step === "email"
              ? "Enter your email and we'll send a 6-digit reset code."
              : `Code sent to ${email}. Enter it below with your new password.`}
          </Text>

          {error ? (
            <View style={[styles.apiError, { marginTop: 0, marginBottom: Spacing.md }]}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
              <Text style={[styles.apiErrorText, { color: Colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          {step === "email" ? (
            <>
              <AuthInput
                icon="mail-outline"
                placeholder="your.name@example.com"
                keyboardType="email-address"
                value={email}
                onChangeText={(v) => { setEmail(v); setError(""); }}
              />
              <Pressable
                onPress={sendCode}
                disabled={loading}
                style={[styles.btnPrimary, { backgroundColor: Colors.blue, opacity: loading ? 0.75 : 1, marginTop: Spacing.md }]}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnPrimaryText}>Send Code</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <AuthInput
                icon="keypad-outline"
                placeholder="6-digit code"
                keyboardType="number-pad"
                value={code}
                onChangeText={(v) => { setCode(v); setError(""); }}
              />
              <AuthInput
                icon="lock-closed-outline"
                placeholder="New password"
                isPassword
                value={newPass}
                onChangeText={(v) => { setNewPass(v); setError(""); }}
              />
              <Pressable
                onPress={submitReset}
                disabled={loading}
                style={[styles.btnPrimary, { backgroundColor: Colors.blue, opacity: loading ? 0.75 : 1, marginTop: Spacing.md }]}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnPrimaryText}>Reset Password</Text>}
              </Pressable>
              <Pressable onPress={() => { setStep("email"); setError(""); }} style={styles.modalBack}>
                <Text style={{ color: Colors.blue, fontSize: 13 }}>← Change email</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { login, socialLogin, loading, error } = useAuth();
  const { colors: Colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [socialLoading, setSocialLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const { signInWithGoogle, signInWithApple, signInWithLinkedIn } = useSocialAuth({
    onSuccess: (token, user) => socialLogin(token, user),
    onError:   (msg) => Alert.alert("Sign In Failed", msg),
    onLoading: setSocialLoading,
  });

  function validate() {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = t("auth.emailRequired");
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = t("auth.validEmail");
    if (!password) errs.password = t("auth.passwordRequired");
    else if (password.length < 6) errs.password = t("auth.minPassword");
    return errs;
  }

  function handleLogin() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    login(email, password);
  }

  const anyLoading = loading || socialLoading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Aurora background */}
      <AnimBlob style={[styles.blob, styles.blobTL]} delay={0} />
      <AnimBlob style={[styles.blob, styles.blobBR]} delay={800} />
      <AnimBlob style={[styles.blob, styles.blobMid]} delay={1400} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Animated.View entering={ZoomIn.duration(550).springify()} style={styles.logoWrap}>
            <DevMatchLogo size="md" />
          </Animated.View>

          {/* Card */}
          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.card}>

            <Text style={styles.cardTitle}>{t("auth.welcomeBack")}</Text>
            <Text style={styles.cardSubtitle}>{t("auth.signInSubtitle")}</Text>

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
            </View>

            <Pressable style={styles.forgotRow} onPress={() => setForgotOpen(true)}>
              <Text style={[styles.forgotText, { color: Colors.blue }]}>{t("auth.forgotPassword")}</Text>
            </Pressable>

            {error ? (
              <Animated.View entering={FadeInDown.duration(250)} style={styles.apiError}>
                <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} />
                <Text style={[styles.apiErrorText, { color: Colors.danger }]}>{error}</Text>
              </Animated.View>
            ) : null}

            {/* Sign in button */}
            <PrimaryBtn
              label={t("auth.signIn")}
              onPress={handleLogin}
              loading={anyLoading}
              Colors={Colors}
              styles={styles}
            />

            {/* Register link */}
            <View style={styles.switchRow}>
              <Text style={[styles.switchText, { color: Colors.textSecondary }]}>{t("auth.noAccount")} </Text>
              <Link href="/register" asChild>
                <Pressable>
                  <Text style={[styles.switchLink, { color: Colors.cyan }]}>{t("auth.signUp")}</Text>
                </Pressable>
              </Link>
            </View>

            {/* Social auth */}
            <OrDivider label="Or continue with" Colors={Colors} styles={styles} />

            <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.socialRow}>
              <SocialBtn icon="logo-google"   label="Google"   onPress={signInWithGoogle}   disabled={anyLoading} />
              <SocialBtn icon="logo-apple"    label="Apple"    onPress={signInWithApple}    disabled={anyLoading} />
              <SocialBtn icon="logo-linkedin" label="LinkedIn" onPress={signInWithLinkedIn} disabled={anyLoading} />
            </Animated.View>

          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(400).duration(400)} style={[styles.hint, { color: Colors.textMuted }]}>
            Demo: demo@jobai.com / password123
          </Animated.Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotModal
        visible={forgotOpen}
        onClose={() => setForgotOpen(false)}
        Colors={Colors}
        styles={styles}
      />
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
    blobTL:  { width: 320, height: 320, backgroundColor: Colors.blue,  opacity: 0.13, top: -130, left: -110 },
    blobBR:  { width: 260, height: 260, backgroundColor: Colors.cyan,  opacity: 0.08, bottom: 40, right: -100 },
    blobMid: { width: 180, height: 180, backgroundColor: Colors.pink,  opacity: 0.07, top: "40%", left: -60 },

    logoWrap: { alignItems: "center", marginTop: 72, marginBottom: 28 },

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

    fields: { gap: 0, marginBottom: 4 },

    forgotRow:  { alignSelf: "flex-end", marginBottom: Spacing.lg, marginTop: -2 },
    forgotText: { fontSize: 13, fontWeight: "500" },

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

    switchRow: { flexDirection: "row", justifyContent: "center", marginBottom: Spacing.lg },
    switchText: { fontSize: 13 },
    switchLink: { fontSize: 13, fontWeight: "700" },

    dividerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.lg },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { fontSize: 12, fontWeight: "500" },

    socialRow: { flexDirection: "row", justifyContent: "center", gap: Spacing.xl },

    hint: { marginTop: Spacing.xl, textAlign: "center", fontSize: 11 },

    modalOverlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.65)",
      justifyContent: "center", alignItems: "center",
      paddingHorizontal: Spacing.xl,
    },
    modalCard: {
      width: "100%", borderRadius: Radius.xl, borderWidth: 1.5,
      paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl,
      shadowColor: "#000", shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4, shadowRadius: 24, elevation: 12,
    },
    modalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    modalTitle:    { fontSize: 18, fontWeight: "800" },
    modalSubtitle: { fontSize: 13, marginBottom: Spacing.lg, lineHeight: 19 },
    modalClose:    { padding: 4 },
    modalBack:     { alignSelf: "center", marginTop: Spacing.md, paddingVertical: 4 },
  });
}
