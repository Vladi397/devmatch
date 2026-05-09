import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable,
  TextInput, ActivityIndicator, StatusBar,
} from "react-native";
import Animated, {
  FadeInDown, ZoomIn, useSharedValue, useAnimatedProps, useAnimatedStyle,
  withTiming, withSpring, withRepeat, withSequence, withDelay, Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import type { ColorPalette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/theme";
import { API_URL } from "@/constants/api";

type Analysis = {
  score: number;
  summary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ScoreRing({ score }: { score: number }) {
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const color = score >= 75 ? Colors.success : score >= 50 ? Colors.cyan : Colors.danger;
  const label = score >= 75 ? "Strong Match" : score >= 50 ? "Moderate Match" : "Weak Match";
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [score]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <Animated.View entering={ZoomIn.duration(500).springify()} style={styles.scoreRingWrap}>
      <View style={styles.scoreRingContainer}>
        <Svg width={130} height={130} style={styles.scoreSvg}>
          <Circle cx={65} cy={65} r={RADIUS} stroke={Colors.border} strokeWidth={8} fill="none" />
          <AnimatedCircle
            cx={65} cy={65} r={RADIUS}
            stroke={color} strokeWidth={8} fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            animatedProps={animProps}
            strokeLinecap="round"
            transform="rotate(-90, 65, 65)"
          />
        </Svg>
        <View style={styles.scoreCenter}>
          <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
          <Text style={styles.scoreLabel}>/ 100</Text>
        </View>
      </View>
      <Text style={[styles.scoreGrade, { color }]}>{label}</Text>
    </Animated.View>
  );
}

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

function KeywordChip({ label, type, index }: { label: string; type: "match" | "miss"; index: number }) {
  const { colors: Colors } = useTheme();
  const bg = type === "match" ? Colors.success + "22" : Colors.danger + "22";
  const fg = type === "match" ? Colors.success : Colors.danger;
  const icon = type === "match" ? "checkmark" : "close";
  return (
    <Animated.View entering={ZoomIn.delay(index * 40).duration(300).springify()}>
      <View style={[{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={10} color={fg} />
        <Text style={{ fontSize: 12, fontWeight: "600", color: fg }}>{label}</Text>
      </View>
    </Animated.View>
  );
}

function AnalyzeBtn({ onPress, loading, disabled, styles }: {
  onPress: () => void; loading: boolean; disabled: boolean; styles: any;
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
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[styles.analyzeBtn, disabled && styles.analyzeBtnDisabled, anim]}>
        {loading ? (
          <View style={styles.analyzingRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.analyzeBtnText}>Analyzing…</Text>
          </View>
        ) : (
          <>
            <Ionicons name="analytics-outline" size={18} color="#fff" />
            <Text style={styles.analyzeBtnText}>Analyze Match</Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function ATSScreen() {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors: Colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [jobDescription, setJobDescription] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!jobDescription.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setLoading(true);
      setError(null);
      setAnalysis(null);
      const token = await getToken();
      const res = await fetch(`${API_URL}/ats/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Analysis failed");
      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <AnimBlob style={[styles.blob, styles.blobTL]}  delay={0} />
      <AnimBlob style={[styles.blob, styles.blobBR]}  delay={900} />
      <AnimBlob style={[styles.blob, styles.blobMid]} delay={1600} />

      <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>ATS Scanner</Text>
        <Text style={styles.headerSub}>Check how well your resume matches a job</Text>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Input card */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.inputCard}>
          <View style={styles.inputLabelRow}>
            <Ionicons name="document-text-outline" size={15} color={Colors.cyan} />
            <Text style={styles.inputLabel}>Paste Job Description</Text>
          </View>
          <TextInput
            style={[styles.textArea, focused && styles.textAreaFocused]}
            multiline
            numberOfLines={8}
            placeholder="Paste the full job description here to see how well your resume matches..."
            placeholderTextColor={Colors.textMuted}
            value={jobDescription}
            onChangeText={setJobDescription}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            textAlignVertical="top"
          />
          <AnalyzeBtn
            onPress={handleAnalyze}
            loading={loading}
            disabled={!jobDescription.trim() || loading}
            styles={styles}
          />
        </Animated.View>

        {error && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        {/* Results */}
        {analysis && (
          <View style={styles.results}>
            <ScoreRing score={analysis.score} />

            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardTitleAccent} />
                <Text style={styles.cardTitle}>Summary</Text>
              </View>
              <Text style={styles.summaryText}>{analysis.summary}</Text>
            </Animated.View>

            {analysis.matchedKeywords.length > 0 && (
              <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.cardTitleAccent, { backgroundColor: Colors.success }]} />
                  <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                  <Text style={styles.cardTitle}>Matched Keywords</Text>
                  <View style={[styles.countBadge, { backgroundColor: Colors.success + "22" }]}>
                    <Text style={[styles.countBadgeText, { color: Colors.success }]}>{analysis.matchedKeywords.length}</Text>
                  </View>
                </View>
                <View style={styles.chipRow}>
                  {analysis.matchedKeywords.map((k, i) => (
                    <KeywordChip key={k} label={k} type="match" index={i} />
                  ))}
                </View>
              </Animated.View>
            )}

            {analysis.missingKeywords.length > 0 && (
              <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.cardTitleAccent, { backgroundColor: Colors.danger }]} />
                  <Ionicons name="close-circle" size={15} color={Colors.danger} />
                  <Text style={styles.cardTitle}>Missing Keywords</Text>
                  <View style={[styles.countBadge, { backgroundColor: Colors.danger + "22" }]}>
                    <Text style={[styles.countBadgeText, { color: Colors.danger }]}>{analysis.missingKeywords.length}</Text>
                  </View>
                </View>
                <View style={styles.chipRow}>
                  {analysis.missingKeywords.map((k, i) => (
                    <KeywordChip key={k} label={k} type="miss" index={i} />
                  ))}
                </View>
              </Animated.View>
            )}

            {analysis.suggestions.length > 0 && (
              <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.cardTitleAccent, { backgroundColor: Colors.cyan }]} />
                  <Ionicons name="bulb-outline" size={15} color={Colors.cyan} />
                  <Text style={styles.cardTitle}>Suggestions</Text>
                </View>
                {analysis.suggestions.map((s, i) => (
                  <Animated.View key={i} entering={FadeInDown.delay(300 + i * 50).duration(300)} style={styles.suggestionRow}>
                    <View style={styles.suggestionDot} />
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Animated.View>
                ))}
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    blob: { position: "absolute", borderRadius: 999 },
    blobTL:  { width: 260, height: 260, backgroundColor: Colors.pink, opacity: 0.07, top: -90, left: -80 },
    blobBR:  { width: 200, height: 200, backgroundColor: Colors.blue, opacity: 0.08, bottom: 80, right: -70 },
    blobMid: { width: 150, height: 150, backgroundColor: Colors.cyan, opacity: 0.06, top: "42%", left: -40 },
    header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
    headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
    headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
    scroll: { flex: 1, paddingHorizontal: Spacing.xl },

    inputCard: {
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border,
      padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.lg,
    },
    inputLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    inputLabel: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" },
    textArea: {
      backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
      borderRadius: Radius.md, padding: Spacing.lg,
      color: Colors.textPrimary, fontSize: 13, lineHeight: 20, minHeight: 150,
    },
    textAreaFocused: { borderColor: Colors.cyan },
    analyzeBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.blue,
      shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 5,
    },
    analyzingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    analyzeBtnDisabled: { opacity: 0.45 },
    analyzeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    errorCard: {
      flexDirection: "row", alignItems: "center", gap: Spacing.sm,
      backgroundColor: Colors.danger + "18", borderRadius: Radius.md,
      borderWidth: 1, borderColor: Colors.danger + "44",
      padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    errorText: { color: Colors.danger, fontSize: 13, flex: 1 },

    results: { gap: Spacing.md },

    scoreRingWrap: { alignItems: "center", paddingVertical: Spacing.xl },
    scoreRingContainer: { width: 130, height: 130, alignItems: "center", justifyContent: "center" },
    scoreSvg: { position: "absolute" },
    scoreCenter: { alignItems: "center" },
    scoreNumber: { fontSize: 36, fontWeight: "800" },
    scoreLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
    scoreGrade: { fontSize: 15, fontWeight: "700", letterSpacing: 0.5, marginTop: Spacing.md },

    card: {
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
      shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
    },
    cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    cardTitleAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: Colors.blue },
    cardTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary, flex: 1 },
    countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
    countBadgeText: { fontSize: 11, fontWeight: "700" },
    summaryText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

    suggestionRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    suggestionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.cyan, marginTop: 7, flexShrink: 0 },
    suggestionText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  });
}
