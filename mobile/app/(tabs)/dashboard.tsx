import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { JobCard } from "@/components/JobCard";
import { MOCK_JOBS } from "@/data/mockData";
import { Colors, Radius, Spacing } from "@/constants/theme";

const STATS = [
  { label: "Saved Jobs", value: "5", icon: "bookmark-outline" as const, color: Colors.blue },
  { label: "Applied", value: "2", icon: "paper-plane-outline" as const, color: Colors.cyan },
  { label: "Interviews", value: "1", icon: "calendar-outline" as const, color: Colors.success },
  { label: "Rejected", value: "5", icon: "close-circle-outline" as const, color: Colors.danger },
];

const ACTIVITIES = [
  { label: "Resume tailored for ASML", time: "20:59", icon: "document-text-outline" as const },
  { label: "Applied send to Philips", time: "20:01", icon: "checkmark-circle-outline" as const },
  { label: "Saved job at Fontys", time: "19:32", icon: "bookmark-outline" as const },
];

export default function DashboardScreen() {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <DevMatchLogo size="sm" showWordmark={false} />
        <DevMatchLogo size="sm" />
        <TouchableOpacity>
          <Ionicons name="person-circle-outline" size={32} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Greeting */}
        <View style={styles.greetBlock}>
          <Text style={styles.greetText}>
            Hi Vladi, you have{" "}
            <Text style={{ color: Colors.cyan }}>3 new</Text>
            {"\n"}job matches today
          </Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={18} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent Activities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          <View style={styles.activityCard}>
            {ACTIVITIES.map((a, i) => (
              <View key={i} style={[styles.activityRow, i < ACTIVITIES.length - 1 && styles.activityRowBorder]}>
                <Ionicons name={a.icon} size={16} color={Colors.blue} />
                <Text style={styles.activityLabel}>{a.label}</Text>
                <Text style={styles.activityTime}>{a.time}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Job Matches Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Matches Preview</Text>
          <JobCard job={MOCK_JOBS[0]} />
        </View>
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
    paddingBottom: Spacing.lg,
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.xl },

  greetBlock: { marginBottom: Spacing.xl },
  greetText: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary, lineHeight: 30 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: "48%",
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: "flex-start",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },

  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    letterSpacing: 0.3,
  },

  activityCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    gap: Spacing.md,
  },
  activityRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  activityLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  activityTime: { fontSize: 12, color: Colors.textMuted, fontWeight: "500" },
});