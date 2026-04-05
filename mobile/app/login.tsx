import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { AuthInput } from "@/components/AuthInput";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Radius, Spacing } from "@/constants/theme";

function validate(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};
  if (!email.trim()) errors.email = "Email is required.";
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Enter a valid email.";
  if (!password) errors.password = "Password is required.";
  else if (password.length < 6) errors.password = "Minimum 6 characters.";
  return errors;
}

export default function LoginScreen() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function handleLogin() {
    const errs = validate(email, password);
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    login(email, password);
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
          <View style={styles.logoWrap}>
            <DevMatchLogo size="md" />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in to use AI Job Hunter</Text>
            <Text style={styles.cardSubtitle}>Optimize your job hunt</Text>

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

            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.apiError}>
                <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} />
                <Text style={styles.apiErrorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <Link href="/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.registerLink}>Sign up</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with:</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              {(["logo-google", "logo-apple", "logo-linkedin"] as const).map((ic) => (
                <TouchableOpacity key={ic} style={styles.socialBtn} activeOpacity={0.75}>
                  <Ionicons name={ic} size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.hint}>Demo: demo@jobai.com / password123</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  blob: { position: "absolute", borderRadius: 999, opacity: 0.12 },
  blobTL: { width: 260, height: 160, backgroundColor: "#3A4A8A", top: 20, left: -60, transform: [{ rotate: "-20deg" }] },
  blobBR: { width: 220, height: 140, backgroundColor: "#2A3870", bottom: 100, right: -40, transform: [{ rotate: "15deg" }] },
  logoWrap: { alignItems: "center", marginTop: 70, marginBottom: 36 },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xxl,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, textAlign: "center", marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginBottom: Spacing.xl },
  forgotRow: { alignSelf: "flex-end", marginBottom: Spacing.lg, marginTop: -4 },
  forgotText: { fontSize: 13, color: Colors.blue, fontWeight: "500" },
  apiError: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#2A0F16", borderRadius: Radius.sm, padding: 10, marginBottom: Spacing.md,
  },
  apiErrorText: { color: Colors.danger, fontSize: 12, flex: 1 },
  registerRow: { flexDirection: "row", justifyContent: "center", marginBottom: Spacing.lg },
  registerText: { fontSize: 13, color: Colors.textSecondary },
  registerLink: { fontSize: 13, color: Colors.cyan, fontWeight: "600" },
  btnPrimary: {
    backgroundColor: Colors.blue, borderRadius: Radius.full,
    paddingVertical: 15, alignItems: "center", marginBottom: Spacing.xl,
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, color: Colors.textMuted, fontWeight: "500" },
  socialRow: { flexDirection: "row", justifyContent: "center", gap: Spacing.md },
  socialBtn: {
    width: 50, height: 44, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgInput,
    alignItems: "center", justifyContent: "center",
  },
  hint: { marginTop: Spacing.xl, textAlign: "center", fontSize: 11, color: Colors.textMuted },
});