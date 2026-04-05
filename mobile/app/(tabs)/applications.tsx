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

const FILTERS = ["Applied", "Interview", "Rejected", "Pending"];

export default function ApplicationsScreen() {
  const [activeFilter, setActiveFilter] = useState(0);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <DevMatchLogo size="sm" />
        <TouchableOpacity>
          <Ionicons name="person-circle-outline" size={32} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f, i) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, i === activeFilter && styles.filterTabActive]}
            onPress={() => setActiveFilter(i)}
          >
            <Text style={[styles.filterTabText, i === activeFilter && styles.filterTabTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>Your Applications:</Text>
        <Ionicons name="options-outline" size={20} color={Colors.textSecondary} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {MOCK_JOBS.slice(0, 3).map((job) => (
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
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  filterTabActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  filterTabText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  filterTabTextActive: { color: "#fff" },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  listHeaderText: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  scroll: { flex: 1, paddingHorizontal: Spacing.xl },
});