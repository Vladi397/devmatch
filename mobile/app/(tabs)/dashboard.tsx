import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, StatusBar, Platform,
} from "react-native";
import Animated, {
  FadeInDown, FadeInUp, ZoomIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { API_URL } from "@/constants/api";


async function loadItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

type Counts = { pending: number; applied: number; interview: number; rejected: number; all: number };
type RecentApp = { id: string; title: string; company: string; status: string; savedAt: string };

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${time}, ${name.split(" ")[0]}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_META: Record<string, { icon: any; color: string; verb: string }> = {
  pending:   { icon: "bookmark-outline",       color: Colors.cyan,    verb: "Saved" },
  applied:   { icon: "paper-plane-outline",    color: Colors.blue,    verb: "Applied to" },
  interview: { icon: "calendar-outline",       color: Colors.success, verb: "Interview at" },
  rejected:  { icon: "close-circle-outline",   color: Colors.danger,  verb: "Rejected from" },
};

// ─── Count-up hook ───
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

// ─── Stat card ───
function StatCard({ icon, label, value, color, index }: { icon: any; label: string; value: number; color: string; index: number }) {
  const count = useCountUp(value, 300 + index * 80);
  return (
    <Animated.View entering={ZoomIn.delay(250 + index * 70).duration(400).springify()} style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const { getToken } = useAuth();
  const [userName, setUserName] = useState("there");
  const [counts, setCounts] = useState<Counts>({ pending: 0, applied: 0, interview: 0, rejected: 0, all: 0 });
  const [recent, setRecent] = useState<RecentApp[]>([]);

  useEffect(() => {
    (async () => {
      // Load user name from local storage
      try {
        const raw = await loadItem("auth_user");
        if (raw) {
          const user = JSON.parse(raw);
          if (user?.name) setUserName(user.name);
        }
      } catch {}

      // Load application counts + recent activity
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
    })();
  }, []);

  const STATS = [
    { label: "Saved", value: counts.pending,   icon: "bookmark-outline",     color: Colors.cyan },
    { label: "Applied", value: counts.applied,   icon: "paper-plane-outline",  color: Colors.blue },
    { label: "Interviews", value: counts.interview, icon: "calendar-outline",     color: Colors.success },
    { label: "Rejected", value: counts.rejected,  icon: "close-circle-outline", color: Colors.danger },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <DevMatchLogo size="sm" showWordmark={false} />
        <DevMatchLogo size="sm" />
        <TouchableOpacity onPress={() => router.push("/(tabs)/settings")}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Greeting */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.greetBlock}>
          <Text style={styles.greetText}>{greeting(userName)}</Text>
          <Text style={styles.greetSub}>
            {counts.all === 0
              ? "Start saving jobs to track your applications."
              : `You have ${counts.all} job${counts.all === 1 ? "" : "s"} tracked.`}
          </Text>
        </Animated.View>

        {/* Stats grid */}
        <Animated.View entering={FadeInUp.delay(160).duration(400)} style={styles.statsGrid}>
          {STATS.map((s, i) => (
            <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} color={s.color} index={i} />
          ))}
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {counts.all > 0 && (
              <TouchableOpacity onPress={() => router.push("/(tabs)/applications")}>
                <Text style={styles.sectionLink}>View all</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.activityCard}>
            {recent.length === 0 ? (
              <View style={styles.emptyActivity}>
                <Ionicons name="file-tray-outline" size={28} color={Colors.textMuted} />
                <Text style={styles.emptyActivityText}>No activity yet. Save a job to get started.</Text>
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
                      <Ionicons name={meta.icon} size={14} color={meta.color} />
                    </View>
                    <Text style={styles.activityLabel} numberOfLines={1}>
                      {meta.verb} <Text style={{ color: Colors.textPrimary, fontWeight: "600" }}>{app.company}</Text>
                    </Text>
                    <Text style={styles.activityTime}>{timeAgo(app.savedAt)}</Text>
                  </Animated.View>
                );
              })
            )}
          </View>
        </Animated.View>

        {/* Quick actions */}
        <Animated.View entering={FadeInDown.delay(420).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/jobs")} activeOpacity={0.8}>
              <Ionicons name="briefcase-outline" size={22} color={Colors.blue} />
              <Text style={styles.quickLabel}>Browse Jobs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/resume")} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={22} color={Colors.cyan} />
              <Text style={styles.quickLabel}>My Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/applications")} activeOpacity={0.8}>
              <Ionicons name="mail-outline" size={22} color={Colors.success} />
              <Text style={styles.quickLabel}>Applications</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.xl, paddingTop: 54, paddingBottom: Spacing.lg,
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.xl },

  greetBlock: { marginBottom: Spacing.xl },
  greetText: { fontSize: 24, fontWeight: "800", color: Colors.textPrimary, lineHeight: 30 },
  greetSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: {
    width: "48%", backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, gap: 4,
  },
  statIconWrap: { width: 30, height: 30, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontSize: 26, fontWeight: "800" },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },

  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, letterSpacing: 0.3 },
  sectionLink: { fontSize: 12, color: Colors.blue, fontWeight: "600" },

  activityCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.lg, paddingVertical: 13, gap: Spacing.md,
  },
  activityRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  activityIcon: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  activityLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  activityTime: { fontSize: 11, color: Colors.textMuted },

  emptyActivity: { alignItems: "center", gap: Spacing.sm, padding: Spacing.xl },
  emptyActivityText: { fontSize: 13, color: Colors.textMuted, textAlign: "center" },

  quickRow: { flexDirection: "row", gap: Spacing.sm },
  quickCard: {
    flex: 1, backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, alignItems: "center", gap: Spacing.sm,
  },
  quickLabel: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary, textAlign: "center" },
});
