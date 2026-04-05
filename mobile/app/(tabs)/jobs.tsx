import React, { useState } from "react";
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

const ROLES = ["Frontend Developer", "Backend Developer", "Full Stack", "Cloud Engineer"];

export default function JobsScreen() {
  const [selectedRole, setSelectedRole] = useState(0);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <DevMatchLogo size="sm" />
        <TouchableOpacity>
          <Ionicons name="person-circle-outline" size={32} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Role filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {ROLES.map((r, i) => (
          <TouchableOpacity
            key={r}
            style={[styles.filterChip, i === selectedRole && styles.filterChipActive]}
            onPress={() => setSelectedRole(i)}
          >
            <Text style={[styles.filterChipText, i === selectedRole && styles.filterChipTextActive]}>
              {r}
            </Text>
            {i === selectedRole && (
              <Ionicons name="chevron-down" size={12} color="#fff" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.matchLabel}>
        <Text style={styles.matchLabelText}>Top job matches:</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {MOCK_JOBS.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
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
  filterBar: { maxHeight: 52 },
  filterContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  filterChipActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  matchLabel: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  matchLabelText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.xl },
});