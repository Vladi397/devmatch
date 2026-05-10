import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar,
} from "react-native";
import Animated, {
  FadeInDown, FadeInUp, ZoomIn, ZoomInEasyDown,
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  withRepeat, withSequence, Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing } from "@/constants/theme";
import type { ColorPalette } from "@/constants/theme";
import { savePreferences } from "@/hooks/usePreferences";

const ROLES = [
  "Frontend Developer", "Backend Developer", "Full Stack",
  "Cloud Engineer", "DevOps", "Mobile Developer",
  "Data Engineer", "Tech Support", "AI / Machine Learning",
];

const TECH_STACK = [
  "HTML", "CSS", "JavaScript", "TypeScript", "React", "Vue", "Angular",
  "Node.js", "Python", "Java", "Go", "Rust", "PHP",
  "React Native", "Flutter", "iOS", "Android",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes",
  "PostgreSQL", "MongoDB", "Redis", "GraphQL",
];

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
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, margin: 4 },
  text: { fontSize: 13, fontWeight: "600" },
});

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

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { colors: Colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [step, setStep] = useState<"prefs" | "analyzing" | "done">("prefs");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTech, setSelectedTech] = useState<string[]>([]);

  // Progress bar for analyzing step
  const progress = useSharedValue(0);
  const progressAnim = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as any }));

  function toggleRole(r: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }
  function toggleTech(t: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTech((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  async function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("analyzing");
    progress.value = 0;
    progress.value = withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) });

    await savePreferences({ roles: selectedRoles, techStack: selectedTech, onboardingDone: true });

    setTimeout(() => {
      setStep("done");
    }, 2400);
  }

  function handleFinish() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(tabs)/dashboard");
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <AnimBlob style={[styles.blob, styles.blobTL]} delay={0} />
      <AnimBlob style={[styles.blob, styles.blobBR]} delay={1000} />

      {step === "prefs" && (
        <ScrollView
          contentContainerStyle={[styles.prefsContainer, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={ZoomIn.duration(400).springify()} style={{ alignItems: "center", marginBottom: Spacing.lg }}>
            <DevMatchLogo size="sm" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.titleBlock}>
            <Text style={styles.title}>What roles interest you?</Text>
            <Text style={styles.subtitle}>Help us find the best job matches for you</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.chipsWrap}>
            {ROLES.map((r) => (
              <SelectChip key={r} label={r} selected={selectedRoles.includes(r)} onPress={() => toggleRole(r)} color={Colors.blue} />
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.titleBlock}>
            <Text style={styles.title}>What is your Tech Stack?</Text>
            <Text style={styles.subtitle}>This helps the AI suggest tailored job openings</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(340).duration(400)} style={styles.chipsWrap}>
            {TECH_STACK.map((t) => (
              <SelectChip key={t} label={t} selected={selectedTech.includes(t)} onPress={() => toggleTech(t)} color={Colors.cyan} />
            ))}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(420).duration(400)} style={styles.footer}>
            <TouchableOpacity
              style={[styles.continueBtn, (!selectedRoles.length && !selectedTech.length) && styles.continueBtnDisabled]}
              onPress={handleContinue}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFinish} style={{ marginTop: 12 }}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      )}

      {step === "analyzing" && (
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Animated.View entering={ZoomIn.duration(500).springify()} style={{ alignItems: "center", gap: Spacing.xl }}>
            <DevMatchLogo size="lg" />
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <Text style={styles.analyzingTitle}>Analyzing Your Profile</Text>
              <Text style={styles.analyzingSubTitle}>Setting up your personalized job feed…</Text>
            </Animated.View>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressAnim]} />
            </View>
          </Animated.View>
        </View>
      )}

      {step === "done" && (
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Animated.View entering={ZoomInEasyDown.duration(500).springify()} style={{ alignItems: "center", gap: Spacing.xl }}>
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
              <TouchableOpacity style={styles.continueBtn} onPress={handleFinish} activeOpacity={0.85}>
                <Text style={styles.continueBtnText}>Go to Dashboard</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    blob: { position: "absolute", borderRadius: 9999, opacity: 0.07 },
    blobTL: { width: 320, height: 320, backgroundColor: Colors.blue, top: -130, left: -130 },
    blobBR: { width: 260, height: 260, backgroundColor: Colors.cyan, bottom: -100, right: -100 },

    prefsContainer: { paddingHorizontal: Spacing.xl },
    titleBlock: { marginTop: Spacing.xl, marginBottom: Spacing.sm },
    title: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
    subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
    chipsWrap: { flexDirection: "row", flexWrap: "wrap", marginVertical: Spacing.sm },

    footer: { marginTop: Spacing.xl },
    continueBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, backgroundColor: Colors.blue, borderRadius: Radius.full, paddingVertical: 16,
    },
    continueBtnDisabled: { opacity: 0.5 },
    continueBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    skipText: { textAlign: "center", color: Colors.textMuted, fontSize: 14 },

    centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xl * 2 },
    analyzingTitle: { fontSize: 26, fontWeight: "800", color: Colors.textPrimary, textAlign: "center" },
    analyzingSubTitle: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginTop: 6 },
    progressTrack: {
      width: "100%", height: 6, backgroundColor: Colors.border,
      borderRadius: Radius.full, overflow: "hidden",
    },
    progressFill: { height: "100%", backgroundColor: Colors.blue, borderRadius: Radius.full },

    doneTitle: { fontSize: 30, fontWeight: "900", color: Colors.textPrimary, textAlign: "center" },
    doneSub: { fontSize: 15, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
  });
}
