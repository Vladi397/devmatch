import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, ActivityIndicator, Linking, Platform, Image,
} from "react-native";
import Animated, {
  FadeInDown, FadeInUp, ZoomIn,
  useSharedValue, useAnimatedProps, withTiming, Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Radius, Spacing } from "@/constants/theme";
import type { ColorPalette } from "@/constants/theme";
import { API_URL } from "@/constants/api";
import { getSelectedJob } from "@/store/selectedJob";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Tab = "details" | "tools";
type Tone = "professional" | "casual" | "confident" | "creative";
type MatchData = {
  score: number;
  projectedScore: number;
  breakdown: { skills: number; experience: number; keywords: number };
  matchLevel: string;
};

function ScoreRing({ score, color }: { score: number; color: string }) {
  const progress = useSharedValue(0);
  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  useEffect(() => {
    progress.value = withTiming(score / 100, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [score]);

  return (
    <Svg width={120} height={120}>
      <Circle cx={60} cy={60} r={RADIUS} stroke="#ffffff18" strokeWidth={10} fill="none" />
      <AnimatedCircle
        cx={60} cy={60} r={RADIUS}
        stroke={color}
        strokeWidth={10}
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        animatedProps={animProps}
        strokeLinecap="round"
        rotation="-90"
        origin="60,60"
      />
    </Svg>
  );
}

function BreakdownBar({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors: Colors } = useTheme();
  const w = useSharedValue(0);
  const anim = useAnimatedProps(() => ({}));

  useEffect(() => {
    w.value = withTiming(value / 100, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [value]);

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12, color: Colors.textSecondary }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: "700", color }}>{value}%</Text>
      </View>
      <View style={{ height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" }}>
        <Animated.View
          style={{ height: "100%", borderRadius: 2, backgroundColor: color, width: `${value}%` }}
        />
      </View>
    </View>
  );
}

function CompanyAvatarLarge({ company }: { company: string }) {
  const [failed, setFailed] = useState(false);
  const LOGO_DEV_TOKEN = "pk_AR5bsdAtQQ6NVIvvzPLQ8Q";
  const clean = company.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const url = `https://img.logo.dev/${clean}.com?token=${LOGO_DEV_TOKEN}&retina=true`;
  const colors = ["#2D6EF5", "#00C97A", "#FF6B6B", "#F59E0B", "#8B5CF6", "#06B6D4"];
  let hash = 0;
  for (const c of company) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  const color = colors[Math.abs(hash) % colors.length];
  const inits = company.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "?";

  if (!failed) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#fff" }}
        onError={() => setFailed(true)}
        resizeMode="contain"
      />
    );
  }
  return (
    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: color + "22", borderColor: color + "55", borderWidth: 2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "800", color }}>{inits}</Text>
    </View>
  );
}

function openUrl(url: string) {
  if (Platform.OS === "web") window.open(url, "_blank", "noopener");
  else Linking.openURL(url);
}

export default function JobDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors: Colors, isDark } = useTheme();
  const { getToken } = useAuth();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const job = getSelectedJob();
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [expanded, setExpanded] = useState(false);

  // Apply Tools state
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [tone, setTone] = useState<Tone>("professional");
  const [letter, setLetter] = useState<string | null>(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterExpanded, setLetterExpanded] = useState(false);

  // Load match score when Apply Tools tab opens
  useEffect(() => {
    if (activeTab === "tools" && !matchData && !matchLoading && job?.description) {
      loadMatch();
    }
  }, [activeTab]);

  async function loadMatch() {
    if (!job?.description) return;
    setMatchLoading(true);
    setMatchError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/ats/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobTitle: job.title, company: job.company, jobDescription: job.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Match failed");
      setMatchData(data);
    } catch (err: any) {
      setMatchError(err.message ?? "Could not load match score");
    } finally {
      setMatchLoading(false);
    }
  }

  async function generateLetter() {
    if (!job) return;
    setLetterLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/motivation/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: job.title, company: job.company, jobDescription: job.description, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLetter(data.letter);
      setLetterExpanded(true);
    } catch (err: any) {
      setLetter(null);
    } finally {
      setLetterLoading(false);
    }
  }

  const ringColor = matchData
    ? matchData.score >= 75 ? Colors.success : matchData.score >= 50 ? Colors.cyan : Colors.danger
    : Colors.blue;
  const matchLabel = matchData
    ? matchData.score >= 75 ? "Strong match" : matchData.score >= 50 ? "Good match" : "Partial match"
    : "";

  const TONES: { key: Tone; label: string }[] = [
    { key: "casual", label: "Casual" },
    { key: "professional", label: "Professional" },
    { key: "confident", label: "Confident" },
    { key: "creative", label: "Creative" },
  ];

  const tags: string[] = [
    job?.remote ? "Remote" : "",
    ...(job?.tags?.slice(0, 3) ?? []),
  ].filter(Boolean);

  if (!job) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: Colors.textMuted }}>Job not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.blue }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyTopBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openUrl(job.url); }}
        >
          <Text style={styles.applyTopBtnText}>Apply Now</Text>
        </TouchableOpacity>
      </View>

      {/* Job Hero */}
      <Animated.View entering={FadeInDown.duration(350)} style={styles.hero}>
        <CompanyAvatarLarge company={job.company} />
        <Text style={styles.heroTitle} numberOfLines={2}>{job.title}</Text>
        <Text style={styles.heroCompany}>{job.company}</Text>
        <Text style={styles.heroLocation}>{job.location}</Text>
        {job.salary && <Text style={styles.heroSalary}>{job.salary}</Text>}
        <View style={styles.heroBadges}>
          {tags.map((tag) => (
            <View key={tag} style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{tag}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "details" && styles.tabBtnActive]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab("details"); }}
        >
          <Text style={[styles.tabBtnText, activeTab === "details" && styles.tabBtnTextActive]}>Job Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "tools" && styles.tabBtnActive]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab("tools"); }}
        >
          <Ionicons name="sparkles-outline" size={13} color={activeTab === "tools" ? Colors.blue : Colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === "tools" && styles.tabBtnTextActive]}>Apply Tools</Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      {activeTab === "details" ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <Animated.View entering={FadeInDown.duration(300)}>
            <Text style={styles.sectionTitle}>Job Description</Text>
            <Text style={styles.description} numberOfLines={expanded ? undefined : 8}>
              {job.description ?? "No description available."}
            </Text>
            {(job.description?.length ?? 0) > 200 && (
              <TouchableOpacity onPress={() => setExpanded((e) => !e)} style={styles.expandBtn}>
                <Text style={styles.expandBtnText}>{expanded ? "See less" : "See more"}</Text>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={Colors.blue} />
              </TouchableOpacity>
            )}
          </Animated.View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

          {/* Match Score Card */}
          <Animated.View entering={FadeInDown.duration(350)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Your Match Score</Text>
              {matchData && (
                <View style={[styles.matchLevelBadge, { backgroundColor: ringColor + "22" }]}>
                  <Text style={[styles.matchLevelText, { color: ringColor }]}>{matchLabel} +</Text>
                </View>
              )}
            </View>

            {matchLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
                <ActivityIndicator size="large" color={Colors.blue} />
                <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>Analyzing your resume…</Text>
              </View>
            ) : matchError ? (
              <View style={{ padding: Spacing.md, gap: 8 }}>
                <Text style={{ color: Colors.danger, fontSize: 13 }}>{matchError}</Text>
                <TouchableOpacity onPress={loadMatch}>
                  <Text style={{ color: Colors.blue, fontSize: 13, fontWeight: "600" }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : matchData ? (
              <View style={styles.matchContent}>
                <View style={styles.scoreRingWrap}>
                  <ScoreRing score={matchData.score} color={ringColor} />
                  <View style={styles.scoreCenter}>
                    <Text style={[styles.scoreNumber, { color: ringColor }]}>{matchData.score}%</Text>
                  </View>
                </View>
                <View style={styles.breakdownList}>
                  <BreakdownBar label="Skills" value={matchData.breakdown.skills} color={Colors.cyan} />
                  <BreakdownBar label="Experience" value={matchData.breakdown.experience} color={Colors.blue} />
                  <BreakdownBar label="Keywords" value={matchData.breakdown.keywords} color={Colors.pink} />
                </View>
              </View>
            ) : (
              <View style={{ alignItems: "center", padding: Spacing.lg }}>
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Upload your resume to see your match score.</Text>
              </View>
            )}
          </Animated.View>

          {/* AI Resume Boost Card */}
          {matchData && (
            <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>AI Resume Boost</Text>
                <View style={[styles.matchLevelBadge, { backgroundColor: Colors.success + "22" }]}>
                  <Text style={[styles.matchLevelText, { color: Colors.success }]}>
                    +{matchData.projectedScore - matchData.score}% match
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.md }}>
                Tailored to this job's requirements
              </Text>
              <View style={{ gap: 10 }}>
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: Colors.textMuted }}>Before</Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.textSecondary }}>{matchData.score}%</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" }}>
                    <View style={{ height: "100%", width: `${matchData.score}%`, backgroundColor: Colors.textMuted, borderRadius: 2 }} />
                  </View>
                </View>
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: Colors.cyan }}>After</Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.cyan }}>{matchData.projectedScore}%</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" }}>
                    <View style={{ height: "100%", width: `${matchData.projectedScore}%`, backgroundColor: Colors.cyan, borderRadius: 2 }} />
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toolBtn, { backgroundColor: Colors.blue, marginTop: Spacing.lg }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/(tabs)/resume"); }}
              >
                <Ionicons name="sparkles-outline" size={14} color="#fff" />
                <Text style={styles.toolBtnText}>Improve My Resume</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Motivation Letter Card */}
          <Animated.View entering={FadeInDown.delay(200).duration(350)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Motivation Letter</Text>
              {letter && (
                <View style={[styles.matchLevelBadge, { backgroundColor: Colors.success + "22" }]}>
                  <Text style={[styles.matchLevelText, { color: Colors.success }]}>Ready</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.md }}>
              Tailored to this job's requirements
            </Text>

            {/* Tone selector */}
            <View style={styles.toneRow}>
              {TONES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.toneChip, tone === t.key && styles.toneChipActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTone(t.key); setLetter(null); }}
                >
                  <Text style={[styles.toneText, tone === t.key && styles.toneTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {letter && (
              <TouchableOpacity onPress={() => setLetterExpanded((e) => !e)} style={styles.letterPreview}>
                <Text style={styles.letterText} numberOfLines={letterExpanded ? undefined : 3}>{letter}</Text>
                <Text style={[styles.expandBtnText, { marginTop: 6 }]}>{letterExpanded ? "Show less" : "Show full letter"}</Text>
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md }}>
              <TouchableOpacity
                style={[styles.toolBtn, { flex: 1, backgroundColor: Colors.blue }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); generateLetter(); }}
                disabled={letterLoading}
              >
                {letterLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                    <Ionicons name="sparkles-outline" size={14} color="#fff" />
                    <Text style={styles.toolBtnText}>{letter ? "Regenerate" : "Generate"}</Text>
                  </>
                }
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      )}

      {/* Apply Now bottom button */}
      <Animated.View entering={FadeInUp.duration(400)} style={[styles.applyBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.applyBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); openUrl(job.url); }}
          activeOpacity={0.85}
        >
          <Text style={styles.applyBtnText}>APPLY NOW</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },

    topBar: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
    },
    backBtn: {
      width: 38, height: 38, borderRadius: Radius.sm,
      borderWidth: 1, borderColor: Colors.border,
      alignItems: "center", justifyContent: "center",
    },
    applyTopBtn: {
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full,
      backgroundColor: Colors.blue + "22", borderWidth: 1, borderColor: Colors.blue,
    },
    applyTopBtnText: { color: Colors.blue, fontSize: 13, fontWeight: "700" },

    hero: { alignItems: "center", paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: 6 },
    heroTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary, textAlign: "center", lineHeight: 24 },
    heroCompany: { fontSize: 14, color: Colors.blue, fontWeight: "600" },
    heroLocation: { fontSize: 12, color: Colors.textMuted },
    heroSalary: { fontSize: 14, fontWeight: "700", color: Colors.success },
    heroBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 },
    heroBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
    heroBadgeText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },

    tabBar: {
      flexDirection: "row", marginHorizontal: Spacing.xl, marginBottom: Spacing.md,
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: 4,
      borderWidth: 1, borderColor: Colors.border,
    },
    tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: Radius.md },
    tabBtnActive: { backgroundColor: Colors.blue },
    tabBtnText: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
    tabBtnTextActive: { color: "#fff", fontWeight: "700" },

    scroll: { flex: 1, paddingHorizontal: Spacing.xl },
    sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: Spacing.md },
    description: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
    expandBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: Spacing.sm },
    expandBtnText: { fontSize: 13, color: Colors.blue, fontWeight: "600" },

    card: {
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border,
      padding: Spacing.lg, marginBottom: Spacing.lg,
      shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.md },
    cardTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
    matchLevelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
    matchLevelText: { fontSize: 11, fontWeight: "700" },

    matchContent: { flexDirection: "row", alignItems: "center", gap: Spacing.lg },
    scoreRingWrap: { position: "relative", width: 120, height: 120 },
    scoreCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
    scoreNumber: { fontSize: 22, fontWeight: "900" },
    breakdownList: { flex: 1, gap: Spacing.md },

    toneRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: Spacing.md },
    toneChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
    toneChipActive: { borderColor: Colors.blue, backgroundColor: Colors.blue + "18" },
    toneText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
    toneTextActive: { color: Colors.blue },

    letterPreview: { backgroundColor: Colors.bg, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.sm },
    letterText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

    toolBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: Radius.md },
    toolBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

    applyBar: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      paddingHorizontal: Spacing.xl, paddingTop: Spacing.md,
      backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    applyBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, backgroundColor: Colors.blue, borderRadius: Radius.full, paddingVertical: 16,
      shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
    },
    applyBtnText: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  });
}
