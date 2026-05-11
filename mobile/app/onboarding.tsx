import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import Animated, {
  FadeInDown, FadeInUp, ZoomIn, ZoomInEasyDown,
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  withRepeat, withSequence, Easing,
} from "react-native-reanimated";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Radius, Spacing } from "@/constants/theme";
import type { ColorPalette } from "@/constants/theme";
import { savePreferences } from "@/hooks/usePreferences";
import { API_URL } from "@/constants/api";

type Step = "resume" | "prefs" | "analyzing" | "done";

const ROLES = [
  "Frontend Developer", "Backend Developer", "Full Stack",
  "Cloud Engineer", "DevOps", "Mobile Developer",
  "Data Engineer", "Tech Support", "AI / Machine Learning",
];

const TECH_STACK = [
  "HTML", "CSS", "JavaScript", "TypeScript", "React", "Vue", "Angular",
  "Node.js", "Python", "Java", "Go", "PHP",
  "React Native", "Flutter", "iOS", "Android",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes",
  "PostgreSQL", "MongoDB", "Redis", "GraphQL",
];

function AnimBlob({ style, delay = 0 }: { style: any; delay?: number }) {
  const sc = useSharedValue(1);
  useEffect(() => {
    sc.value = withDelay(delay, withRepeat(withSequence(
      withTiming(1.14, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.0, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
    ), -1, false));
  }, []);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return <Animated.View style={[style, anim]} />;
}

function SelectChip({ label, selected, onPress, color }: {
  label: string; selected: boolean; onPress: () => void; color: string;
}) {
  const { colors: Colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        chipStyle.chip,
        { borderColor: selected ? color : Colors.border, backgroundColor: selected ? color + "20" : Colors.bgCard },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {selected && <Ionicons name="checkmark-circle" size={14} color={color} />}
      <Text style={[chipStyle.text, { color: selected ? color : Colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const chipStyle = StyleSheet.create({
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, margin: 4,
  },
  text: { fontSize: 13, fontWeight: "600" },
});

const STEP_DOTS: Step[] = ["resume", "prefs", "analyzing", "done"];

function StepDots({ current }: { current: Step }) {
  const { colors: Colors } = useTheme();
  const activeIdx = STEP_DOTS.indexOf(current);
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: Spacing.lg }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: i === Math.min(activeIdx, 2) ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === Math.min(activeIdx, 2) ? Colors.blue : Colors.border,
          }}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { colors: Colors, isDark } = useTheme();
  const { getToken } = useAuth();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [step, setStep] = useState<Step>("resume");

  // Resume step state
  const [uploading, setUploading] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [savingText, setSavingText] = useState(false);

  // Prefs step state
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTech, setSelectedTech] = useState<string[]>([]);

  // Progress bar for analyzing step
  const progress = useSharedValue(0);
  const progressAnim = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  // ── Resume step ──

  async function handleUploadPDF() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const file = result.assets[0];
      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append("resume", {
        uri: file.uri,
        type: file.mimeType || "application/pdf",
        name: file.name || "resume.pdf",
      } as any);

      const token = await getToken();
      const res = await fetch(`${API_URL}/resume/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      setResumeFileName(file.name || "resume.pdf");
      setResumeUploaded(true);
      setShowPasteArea(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed. Make sure it's a valid PDF.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveText() {
    if (!pastedText.trim()) return;
    setSavingText(true);
    setUploadError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/resume/upload-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: pastedText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Save failed");

      setResumeFileName("Pasted resume");
      setResumeUploaded(true);
      setShowPasteArea(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setUploadError(err.message ?? "Could not save resume text.");
    } finally {
      setSavingText(false);
    }
  }

  // ── Prefs step ──

  function toggleRole(r: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }
  function toggleTech(t: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTech((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  async function handleFinishPrefs() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("analyzing");
    progress.value = 0;
    progress.value = withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) });
    await savePreferences({ roles: selectedRoles, techStack: selectedTech, onboardingDone: true });
    setTimeout(() => setStep("done"), 2400);
  }

  function handleGoToDashboard() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(tabs)/dashboard");
  }

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.root}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <AnimBlob style={[styles.blob, styles.blobTL]} delay={0} />
        <AnimBlob style={[styles.blob, styles.blobBR]} delay={1000} />

        {/* ── STEP: RESUME ── */}
        {step === "resume" && (
          <ScrollView
            contentContainerStyle={[styles.container, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={ZoomIn.duration(400).springify()} style={styles.logoWrap}>
              <DevMatchLogo size="sm" />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.titleBlock}>
              <Text style={styles.titleLarge}>Upload Your Resume</Text>
              <Text style={styles.subtitle}>
                DevMatch uses your resume to generate tailored cover letters, match job scores, and ace mock interviews.
              </Text>
            </Animated.View>

            {/* Success state */}
            {resumeUploaded && (
              <Animated.View entering={ZoomIn.duration(400).springify()} style={styles.successCard}>
                <View style={[styles.successIcon, { backgroundColor: Colors.success + "20" }]}>
                  <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.successTitle}>Resume saved!</Text>
                  <Text style={styles.successFile} numberOfLines={1}>{resumeFileName}</Text>
                </View>
                <TouchableOpacity onPress={() => { setResumeUploaded(false); setResumeFileName(null); setShowPasteArea(false); }}>
                  <Ionicons name="pencil-outline" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Upload options (hidden when uploaded) */}
            {!resumeUploaded && (
              <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.uploadOptions}>

                {/* Upload PDF button */}
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={handleUploadPDF}
                  activeOpacity={0.85}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="document-attach-outline" size={20} color="#fff" />
                      <Text style={styles.uploadBtnText}>Upload Resume (PDF)</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Paste text button / area */}
                {!showPasteArea ? (
                  <TouchableOpacity
                    style={styles.pasteBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPasteArea(true); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="clipboard-outline" size={18} color={Colors.blue} />
                    <Text style={styles.pasteBtnText}>Paste Resume Text</Text>
                  </TouchableOpacity>
                ) : (
                  <Animated.View entering={FadeInDown.duration(300)} style={styles.pasteArea}>
                    <Text style={styles.pasteLabel}>Paste your resume content below</Text>
                    <TextInput
                      style={styles.pasteInput}
                      multiline
                      numberOfLines={8}
                      placeholder="Paste your full resume text here..."
                      placeholderTextColor={Colors.textMuted}
                      value={pastedText}
                      onChangeText={setPastedText}
                      textAlignVertical="top"
                    />
                    <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm }}>
                      <TouchableOpacity
                        style={styles.pasteCancelBtn}
                        onPress={() => { setShowPasteArea(false); setPastedText(""); }}
                      >
                        <Text style={styles.pasteCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.uploadBtn, { flex: 1, marginBottom: 0 }, (!pastedText.trim() || savingText) && { opacity: 0.5 }]}
                        onPress={handleSaveText}
                        disabled={!pastedText.trim() || savingText}
                        activeOpacity={0.85}
                      >
                        {savingText ? <ActivityIndicator color="#fff" /> : (
                          <>
                            <Ionicons name="save-outline" size={16} color="#fff" />
                            <Text style={styles.uploadBtnText}>Save Text</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                )}

                {/* Error */}
                {uploadError && (
                  <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} />
                    <Text style={styles.errorText}>{uploadError}</Text>
                  </Animated.View>
                )}
              </Animated.View>
            )}

            {/* Privacy note */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.privacyNote}>
              <Ionicons name="lock-closed-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.privacyText}>
                Your resume is private and used only to generate tailored applications.
              </Text>
            </Animated.View>

            {/* Continue / Skip */}
            <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.footer}>
              <TouchableOpacity
                style={[styles.continueBtn, !resumeUploaded && styles.continueBtnSecondary]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep("prefs"); }}
                activeOpacity={0.85}
              >
                <Text style={[styles.continueBtnText, !resumeUploaded && styles.continueBtnTextSecondary]}>
                  {resumeUploaded ? "Continue" : "Skip for now"}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={resumeUploaded ? "#fff" : Colors.textSecondary}
                />
              </TouchableOpacity>
            </Animated.View>

            <StepDots current={step} />
          </ScrollView>
        )}

        {/* ── STEP: PREFS ── */}
        {step === "prefs" && (
          <ScrollView
            contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={ZoomIn.duration(400).springify()} style={styles.logoWrap}>
              <DevMatchLogo size="sm" />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.titleBlock}>
              <Text style={styles.titleLarge}>What roles interest you?</Text>
              <Text style={styles.subtitle}>Help us find the best job matches for you</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(140).duration(400)} style={styles.chipsWrap}>
              {ROLES.map((r) => (
                <SelectChip key={r} label={r} selected={selectedRoles.includes(r)} onPress={() => toggleRole(r)} color={Colors.blue} />
              ))}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.titleBlock}>
              <Text style={styles.titleLarge}>What is your Tech Stack?</Text>
              <Text style={styles.subtitle}>This helps the AI suggest tailored job openings</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.chipsWrap}>
              {TECH_STACK.map((t) => (
                <SelectChip key={t} label={t} selected={selectedTech.includes(t)} onPress={() => toggleTech(t)} color={Colors.cyan} />
              ))}
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(360).duration(400)} style={styles.footer}>
              <TouchableOpacity style={styles.continueBtn} onPress={handleFinishPrefs} activeOpacity={0.85}>
                <Text style={styles.continueBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFinishPrefs} style={{ marginTop: 12 }}>
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </Animated.View>

            <StepDots current={step} />
          </ScrollView>
        )}

        {/* ── STEP: ANALYZING ── */}
        {step === "analyzing" && (
          <View style={[styles.centered, { paddingTop: insets.top }]}>
            <Animated.View entering={ZoomIn.duration(500).springify()} style={{ alignItems: "center", gap: Spacing.xl, paddingHorizontal: Spacing.xl * 2 }}>
              <DevMatchLogo size="lg" />
              <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ alignItems: "center", gap: Spacing.sm }}>
                <Text style={styles.analyzingTitle}>Analyzing Your Profile</Text>
                <Text style={styles.analyzingSubTitle}>Setting up your personalized job feed…</Text>
              </Animated.View>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, progressAnim]} />
              </View>
            </Animated.View>
          </View>
        )}

        {/* ── STEP: DONE ── */}
        {step === "done" && (
          <View style={[styles.centered, { paddingTop: insets.top }]}>
            <Animated.View entering={ZoomInEasyDown.duration(500).springify()} style={{ alignItems: "center", gap: Spacing.xl, paddingHorizontal: Spacing.xl * 2 }}>
              <DevMatchLogo size="lg" />
              <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ alignItems: "center", gap: Spacing.md }}>
                <Text style={styles.doneTitle}>
                  You're{" "}
                  <Text style={{ color: Colors.cyan }}>All Set!</Text>
                </Text>
                <Text style={styles.doneSub}>
                  DevMatch is now ready to help you find tailored IT job opportunities.
                </Text>
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(400).duration(400)} style={{ width: "100%" }}>
                <TouchableOpacity style={styles.continueBtn} onPress={handleGoToDashboard} activeOpacity={0.85}>
                  <Text style={styles.continueBtnText}>Go to Dashboard</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    blob: { position: "absolute", borderRadius: 9999, opacity: 0.07 },
    blobTL: { width: 320, height: 320, backgroundColor: Colors.blue, top: -130, left: -130 },
    blobBR: { width: 260, height: 260, backgroundColor: Colors.cyan, bottom: -100, right: -100 },

    container: { paddingHorizontal: Spacing.xl },
    logoWrap: { alignItems: "center", marginBottom: Spacing.md },

    titleBlock: { marginBottom: Spacing.md },
    titleLarge: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary, lineHeight: 28 },
    subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 19 },

    // Resume step
    successCard: {
      flexDirection: "row", alignItems: "center", gap: Spacing.md,
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1.5, borderColor: Colors.success + "55",
      padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    successIcon: { width: 52, height: 52, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
    successTitle: { fontSize: 14, fontWeight: "700", color: Colors.success },
    successFile: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

    uploadOptions: { gap: Spacing.sm, marginBottom: Spacing.md },
    uploadBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, backgroundColor: Colors.blue, borderRadius: Radius.full,
      paddingVertical: 15, marginBottom: Spacing.xs,
      shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
    },
    uploadBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

    dividerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginVertical: Spacing.xs },
    dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    dividerText: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },

    pasteBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, borderRadius: Radius.full, paddingVertical: 14,
      borderWidth: 1.5, borderColor: Colors.blue,
      backgroundColor: Colors.blue + "0C",
    },
    pasteBtnText: { color: Colors.blue, fontSize: 15, fontWeight: "700" },

    pasteArea: {
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
    },
    pasteLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary, marginBottom: Spacing.sm, letterSpacing: 0.4 },
    pasteInput: {
      color: Colors.textPrimary, fontSize: 13, lineHeight: 20,
      minHeight: 160, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    pasteCancelBtn: {
      paddingVertical: 12, paddingHorizontal: Spacing.lg,
      borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
      alignItems: "center", justifyContent: "center",
    },
    pasteCancelText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },

    errorBox: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: Colors.danger + "12", borderRadius: Radius.md,
      padding: Spacing.md, borderWidth: 1, borderColor: Colors.danger + "33",
    },
    errorText: { flex: 1, fontSize: 12, color: Colors.danger, lineHeight: 17 },

    privacyNote: {
      flexDirection: "row", alignItems: "flex-start", gap: 6,
      marginTop: Spacing.md, marginBottom: Spacing.sm,
    },
    privacyText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 17 },

    chipsWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: Spacing.sm },

    // Footer / navigation
    footer: { marginTop: Spacing.xl },
    continueBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, backgroundColor: Colors.blue, borderRadius: Radius.full, paddingVertical: 16,
      shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
    },
    continueBtnSecondary: { backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.border, shadowOpacity: 0 },
    continueBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    continueBtnTextSecondary: { color: Colors.textSecondary },
    skipText: { textAlign: "center", color: Colors.textMuted, fontSize: 14 },

    // Analyzing step
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    analyzingTitle: { fontSize: 26, fontWeight: "800", color: Colors.textPrimary, textAlign: "center" },
    analyzingSubTitle: { fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
    progressTrack: {
      width: "100%", height: 6, backgroundColor: Colors.border,
      borderRadius: Radius.full, overflow: "hidden",
    },
    progressFill: { height: "100%", backgroundColor: Colors.blue, borderRadius: Radius.full },

    // Done step
    doneTitle: { fontSize: 32, fontWeight: "900", color: Colors.textPrimary, textAlign: "center" },
    doneSub: { fontSize: 15, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
  });
}
