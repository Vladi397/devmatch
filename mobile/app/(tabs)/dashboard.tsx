import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Pressable, StatusBar, Platform, RefreshControl,
} from "react-native";
import Animated, {
  FadeInDown, FadeInUp, ZoomIn,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay, withSpring, Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { useAuth } from "@/hooks/useAuth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import type { ColorPalette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/theme";
import { API_URL } from "@/constants/api";

function FloatBlob({ color, size, top, left, bottom, right, delay = 0 }: {
  color: string; size: number; top?: number; left?: number; bottom?: number; right?: number; delay?: number;
}) {
  const sc = useSharedValue(1);
  useEffect(() => {
    sc.value = withDelay(delay, withRepeat(withSequence(
      withTiming(1.14, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.0,  { duration: 4500, easing: Easing.inOut(Easing.sin) }),
    ), -1, false));
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.07 }, { top, left, bottom, right }, style]} />
  );
}

async function loadItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

type Counts = { pending: number; applied: number; interview: number; rejected: number; all: number };
type RecentApp = { id: string; title: string; company: string; status: string; savedAt: string };

function greetingTime(): "goodMorning" | "goodAfternoon" | "goodEvening" {
  const h = new Date().getHours();
  return h < 12 ? "goodMorning" : h < 18 ? "goodAfternoon" : "goodEvening";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function useCountUp(target: number, delay = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    const t = setTimeout(() => {
      const start = Date.now();
      const iv = setInterval(() => {
        const p = Math.min((Date.now() - start) / 700, 1);
        setCount(Math.round(target * p));
        if (p >= 1) clearInterval(iv);
      }, 16);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [target]);
  return count;
}

function QuickCard({ route, icon, label, sub, color }: { route: string; icon: string; label: string; sub: string; color: string }) {
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const scale = useSharedValue(1);
  const rotX  = useSharedValue(0);
  const anim  = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { scale: scale.value }, { rotateX: `${rotX.value}deg` }],
  }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 14 }); rotX.value = withSpring(5, { damping: 12 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 14 }); rotX.value = withSpring(0, { damping: 12 }); }}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(route as any); }}
    >
      <Animated.View style={[styles.quickCard, { borderLeftColor: color + "90", borderLeftWidth: 3 }, anim]}>
        <View style={[styles.quickIconWrap, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.quickText}>
          <Text style={styles.quickLabel}>{label}</Text>
          <Text style={styles.quickSub}>{sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </Animated.View>
    </Pressable>
  );
}

function StatCard({ icon, label, value, color, index }: { icon: any; label: string; value: number; color: string; index: number }) {
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const count = useCountUp(value, 300 + index * 80);
  return (
    <Animated.View entering={ZoomIn.delay(250 + index * 70).duration(400).springify()} style={styles.statCard}>
      <View style={[styles.statTop, { borderTopColor: color }]}>
        <View style={[styles.statIconWrap, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={[styles.statValue, { color }]}>{count}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors: Colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [userName, setUserName] = useState("there");
  const [counts, setCounts] = useState<Counts>({ pending: 0, applied: 0, interview: 0, rejected: 0, all: 0 });
  const [recent, setRecent] = useState<RecentApp[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const STATUS_META: Record<string, { icon: any; color: string; verb: string }> = {
    pending:   { icon: "bookmark-outline",     color: Colors.cyan,    verb: t("dashboard.statusSaved") },
    applied:   { icon: "paper-plane-outline",  color: Colors.blue,    verb: t("dashboard.statusAppliedTo") },
    interview: { icon: "calendar-outline",     color: Colors.success, verb: t("dashboard.statusInterviewAt") },
    rejected:  { icon: "close-circle-outline", color: Colors.danger,  verb: t("dashboard.statusRejectedFrom") },
  };

  const STAT_CONFIG = [
    { key: "pending"   as const, label: t("dashboard.saved"),      icon: "bookmark-outline",     color: Colors.cyan },
    { key: "applied"   as const, label: t("dashboard.applied"),    icon: "paper-plane-outline",  color: Colors.blue },
    { key: "interview" as const, label: t("dashboard.interviews"), icon: "calendar-outline",     color: Colors.success },
    { key: "rejected"  as const, label: t("dashboard.rejected"),   icon: "close-circle-outline", color: Colors.danger },
  ];

  const loadData = useCallback(async () => {
    try {
      const raw = await loadItem("auth_user");
      if (raw) {
        const user = JSON.parse(raw);
        if (user?.name) setUserName(user.name);
      }
    } catch {}
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts);
        setRecent((data.applications as RecentApp[]).slice(0, 4));
      }
    } catch {}
  }, [getToken]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <FloatBlob color={Colors.blue} size={320} top={-90} left={-130} delay={0} />
      <FloatBlob color={Colors.cyan} size={240} top={220} right={-110} delay={1200} />
      <FloatBlob color={Colors.pink} size={180} bottom={90} left={-80} delay={700} />

      <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <DevMatchLogo size="sm" />
        <TouchableOpacity onPress={() => router.push("/(tabs)/settings")} activeOpacity={0.7}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.blue} />
        }
      >
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.greetBlock}>
          <Text style={styles.greetText}>
            Hi {userName.split(" ")[0]}, you have{" "}
            <Text style={{ color: Colors.cyan }}>{Math.max(counts.all, 3)} new</Text>
            {"\n"}job matches today
          </Text>
          <Text style={styles.greetSub}>
            {counts.all === 0
              ? "Start saving jobs to track your applications."
              : `${counts.applied} applied · ${counts.interview} interview${counts.interview === 1 ? "" : "s"} · ${counts.pending} saved`}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(160).duration(400)} style={styles.statsGrid}>
          {STAT_CONFIG.map((s, i) => (
            <StatCard key={s.key} icon={s.icon} label={s.label} value={counts[s.key]} color={s.color} index={i} />
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("dashboard.recentActivity")}</Text>
            {counts.all > 0 && (
              <TouchableOpacity onPress={() => router.push("/(tabs)/applications")}>
                <Text style={styles.sectionLink}>{t("dashboard.viewAll")}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.activityCard}>
            {recent.length === 0 ? (
              <View style={styles.emptyActivity}>
                <Ionicons name="file-tray-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyActivityTitle}>{t("dashboard.noActivity")}</Text>
                <Text style={styles.emptyActivityText}>Save a job to start tracking your applications.</Text>
              </View>
            ) : (
              recent.map((app, i) => {
                const meta = STATUS_META[app.status] ?? STATUS_META.pending;
                return (
                  <Animated.View
                    key={app.id}
                    entering={FadeInDown.delay(350 + i * 60).duration(300)}
                    style={[styles.activityRow, i < recent.length - 1 && styles.activityRowBorder]}
                  >
                    <View style={[styles.activityIcon, { backgroundColor: meta.color + "18" }]}>
                      <Ionicons name={meta.icon} size={13} color={meta.color} />
                    </View>
                    <Text style={styles.activityLabel} numberOfLines={1}>
                      {meta.verb}{" "}
                      <Text style={{ color: Colors.textPrimary, fontWeight: "600" }}>{app.company}</Text>
                    </Text>
                    <Text style={styles.activityTime}>{timeAgo(app.savedAt)}</Text>
                  </Animated.View>
                );
              })
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(420).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickCol}>
            <QuickCard route="/(tabs)/jobs"        icon="briefcase-outline"     label="Browse Jobs"  sub="Find your next role"  color={Colors.blue}    />
            <QuickCard route="/(tabs)/resume"       icon="document-text-outline" label="My Resume"    sub="Upload & optimize"    color={Colors.cyan}    />
            <QuickCard route="/(tabs)/applications" icon="layers-outline"        label="Applications" sub="Track your progress"  color={Colors.success} />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
    },
    scroll: { flex: 1, paddingHorizontal: Spacing.xl },

    greetBlock: { marginBottom: Spacing.xl },
    greetText: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary, lineHeight: 28 },
    greetSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.xl },
    statCard: {
      width: "48%", backgroundColor: Colors.bgCard,
      borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 3,
    },
    statTop: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      padding: Spacing.lg, borderTopWidth: 3,
    },
    statIconWrap: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
    statValue: { fontSize: 28, fontWeight: "800" },
    statLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600", paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },

    section: { marginBottom: Spacing.xl },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary, letterSpacing: 0.3 },
    sectionLink: { fontSize: 12, color: Colors.blue, fontWeight: "600" },

    activityCard: {
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border,
      shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
    },
    activityRow: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: Spacing.lg, paddingVertical: 13, gap: Spacing.md,
    },
    activityRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
    activityIcon: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    activityLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary },
    activityTime: { fontSize: 11, color: Colors.textMuted },
    emptyActivity: { alignItems: "center", gap: 6, paddingVertical: Spacing.xxl },
    emptyActivityTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
    emptyActivityText: { fontSize: 12, color: Colors.textMuted, textAlign: "center" },

    quickCol: { gap: Spacing.sm },
    quickCard: {
      flexDirection: "row", alignItems: "center", gap: Spacing.md,
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
    },
    quickIconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
    quickText: { flex: 1 },
    quickLabel: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
    quickSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  });
}
