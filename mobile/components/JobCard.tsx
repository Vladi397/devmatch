import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Radius, Spacing } from "@/constants/theme";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  matchPct: number;
  tags: string[];
  companyInitials: string;
  companyColor: string;
}

interface JobCardProps {
  job: Job;
  onView?: () => void;
  onSave?: () => void;
}

function MatchBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? Colors.pink : pct >= 60 ? Colors.warning : Colors.textMuted;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{pct}% match</Text>
    </View>
  );
}

function CompanyAvatar({ initials, color }: { initials: string; color: string }) {
  return (
    <View style={[styles.avatar, { backgroundColor: color + "22", borderColor: color + "55" }]}>
      <Text style={[styles.avatarText, { color }]}>{initials}</Text>
    </View>
  );
}

function TechChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function JobCard({ job, onView, onSave }: JobCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <CompanyAvatar initials={job.companyInitials} color={job.companyColor} />
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.meta}>{job.company}</Text>
          <Text style={styles.meta}>{job.location}</Text>
        </View>
        <MatchBadge pct={job.matchPct} />
      </View>

      <View style={styles.chips}>
        {job.tags.map((t) => (
          <TechChip key={t} label={t} />
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnView} onPress={onView} activeOpacity={0.8}>
          <Text style={styles.btnViewText}>View Job</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSave} onPress={onSave} activeOpacity={0.8}>
          <Text style={styles.btnSaveText}>Save Job</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerInfo: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  badge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: Spacing.md,
  },
  chip: {
    backgroundColor: Colors.bgChip,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 11,
    color: Colors.cyan,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  btnView: {
    flex: 1,
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnViewText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  btnSave: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnSaveText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
});