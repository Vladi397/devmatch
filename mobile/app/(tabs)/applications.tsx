import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, StatusBar,
} from "react-native";
import Animated, {
  FadeInDown, FadeInUp, ZoomIn,
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { JobCard } from "@/components/JobCard";
import { MOCK_JOBS } from "@/data/mockData";
import { Colors, Radius, Spacing } from "@/constants/theme";

const FILTERS = [
  { label: "Applied", color: Colors.blue, icon: "paper-plane-outline" as const },
  { label: "Interview", color: Colors.success, icon: "calendar-outline" as const },
  { label: "Rejected", color: Colors.danger, icon: "close-circle-outline" as const },
  { label: "Pending", color: Colors.cyan, icon: "time-outline" as const },
];

const STATS = [
  { label: "Applied", value: 2, color: Colors.blue, icon: "paper-plane-outline" as const },
  { label: "Interview", value: 1, color: Colors.success, icon: "calendar-outline" as const },
  { label: "Rejected", value: 5, color: Colors.danger, icon: "close-circle-outline" as const },
  { label: "Pending", value: 8, color: Colors.cyan, icon: "time-outline" as const },
];

// ─── Animated count-up hook ───
function useCountUp(target: number, duration = 700, delay = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = Date.now();
      const tick = setInterval(() => {
        const progress = Math.min((Date.now() - start) / duration, 1);
        setCount(Math.round(target * progress));
        if (progress >= 1) clearInterval(tick);
      }, 16);
      return () => clearInterval(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target]);
  return count;
}

// ─── Stat box ───
function StatBox({ stat, index }: { stat: typeof STATS[0]; index: number }) {
  const count = useCountUp(stat.value, 700, 300 + index * 80);
  return (
    <Animated.View entering={ZoomIn.delay(200 + index * 70).duration(400).springify()} style={styles.statBox}>
      <View style={[styles.statIconWrap, { backgroundColor: stat.color + "18" }]}>
        <Ionicons name={stat.icon} size={16} color={stat.color} />
      </View>
      <Text style={[styles.statValue, { color: stat.color }]}>{count}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </Animated.View>
  );
}

// ─── Filter tab with press scale ───
function FilterTab({ filter, active, onPress }: { filter: typeof FILTERS[0]; active: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <TouchableOpacity
        style={[styles.filterTab, active && { backgroundColor: filter.color + "22", borderColor: filter.color }]}
        onPress={() => {
          scale.value = withSequence(withSpring(0.88), withSpring(1));
          onPress();
        }}
        activeOpacity={0.8}
      >
        <Ionicons name={filter.icon} size={13} color={active ? filter.color : Colors.textMuted} />
        <Text style={[styles.filterTabText, active && { color: filter.color, fontWeight: "700" }]}>
          {filter.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ApplicationsScreen() {
  const [activeFilter, setActiveFilter] = useState(0);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <DevMatchLogo size="sm" />
        <Text style={styles.headerTitle}>APPLICATIONS</Text>
      </Animated.View>

      {/* Stats row */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsRow}>
        {STATS.map((s, i) => <StatBox key={s.label} stat={s} index={i} />)}
      </Animated.View>

      {/* Filter tabs */}
      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.filterRow}>
        {FILTERS.map((f, i) => (
          <FilterTab
            key={f.label}
            filter={f}
            active={i === activeFilter}
            onPress={() => setActiveFilter(i)}
          />
        ))}
      </Animated.View>

      {/* List header */}
      <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.listHeader}>
        <Text style={styles.listHeaderText}>Your Applications</Text>
        <View style={styles.listBadge}>
          <Text style={styles.listBadgeText}>{MOCK_JOBS.length}</Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {MOCK_JOBS.map((job, i) => (
          <Animated.View key={job.id} entering={FadeInDown.delay(350 + i * 80).duration(350).springify()}>
            <JobCard job={job} />
          </Animated.View>
        ))}

        {MOCK_JOBS.length === 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptySubtitle}>Save jobs from the Jobs tab to start tracking.</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: 54,
    paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: 13, fontWeight: "800", color: Colors.textMuted, letterSpacing: 2 },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: "center",
    gap: 4,
  },
  statIconWrap: {
    width: 28, height: 28, borderRadius: Radius.sm,
    alignItems: "center", justifyContent: "center",
    marginBottom: 2,
  },
  statValue: { fontSize: 20, fontWeight: "800", lineHeight: 24 },
  statLabel: { fontSize: 9, fontWeight: "600", color: Colors.textMuted, letterSpacing: 0.5, textTransform: "uppercase" },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: "wrap",
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  filterTabText: { fontSize: 12, color: Colors.textMuted, fontWeight: "500" },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  listHeaderText: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  listBadge: {
    backgroundColor: Colors.blue + "22",
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  listBadgeText: { fontSize: 11, fontWeight: "700", color: Colors.blue },

  scroll: { flex: 1, paddingHorizontal: Spacing.xl },

  emptyState: { alignItems: "center", gap: Spacing.md, paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center" },
});
